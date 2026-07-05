$.hermes = {};

$.hermes.autoPlace = function(mpc) {
    var LOG = "C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs/pr_log.txt";
    var logDir = new Folder("C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs");
    if (!logDir.exists) logDir.create();
    var F = new File(LOG);
    F.open("w");
    var ok = true;

    try {
        F.write("=== auto place ===\n");
        var seq = app.project.activeSequence;
        if (!seq) { F.write("FAIL: no seq\n"); ok = false; }

        if (ok) {
            F.write("seq: " + seq.name + "\n");
            F.write("mpc: " + mpc + "\n");

            var ip = seq.getInPointAsTime();
            F.write("I: ticks=" + ip.ticks + " s=" + ip.seconds + "\n");
            var op = seq.getOutPointAsTime();
            F.write("O: ticks=" + op.ticks + " s=" + op.seconds + "\n");

            if (Number(ip.ticks) >= Number(op.ticks)) {
                F.write("FAIL: IO invalid\n");
                ok = false;
            }

            if (ok) {
                var clips = [];
                var vt = seq.videoTracks;
                F.write("tracks: " + vt.numTracks + "\n");
                for (var t = 0; t < vt.numTracks; t++) {
                    var tk = vt[t];
                    var cc = 0;
                    for (var c = 0; c < tk.clips.numItems; c++) {
                        var cl = tk.clips[c];
                        if (Number(cl.end.ticks) <= Number(ip.ticks) ||
                            Number(cl.start.ticks) >= Number(op.ticks)) continue;
                        var es = Math.max(Number(cl.start.ticks), Number(ip.ticks));
                        var ee = Math.min(Number(cl.end.ticks), Number(op.ticks));
                        if (ee - es < 500) continue;
                        clips.push({ s: es, e: ee, d: ee - es });
                        cc++;
                    }
                    F.write("T" + t + ": " + cc + " clips\n");
                }
                F.write("total: " + clips.length + "\n");
                if (!clips.length) {
                    F.write("FAIL: no clips\n");
                    ok = false;
                }

                if (ok) {
                    clips.sort(function(a, b) { return a.s - b.s; });
                    var mk = seq.markers;
                    var tot = 0;
                    for (var i = 0; i < clips.length; i++) {
                        var cl = clips[i];
                        for (var j = 1; j <= mpc; j++) {
                            var mt = (cl.s + Math.round(cl.d * j / (mpc + 1))) / 254016000000;
                            var m = mk.createMarker(mt);
                            if (m) { m.name = "C" + (i + 1) + "-" + j; tot++; }
                        }
                    }
                    F.write("=== done: " + tot + " markers ===\n");
                }
            }
        }
    } catch(e) {
        F.write("ERROR: " + e + "\n");
        ok = false;
    }

    F.close();
    return ok ? "OK" : "FAIL";
};

$.hermes.exportFrames = function(outDir) {
    if (!outDir) outDir = "C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/screenshots";
    var LOG = "C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs/pr_export_log.txt";
    var logDir = new Folder("C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs");
    if (!logDir.exists) logDir.create();
    var F = new File(LOG);
    F.open("w");

    try {
        F.write("=== export (AME encode) ===\n");

        var seq = app.project.activeSequence;
        if (!seq) { F.write("FAIL: no seq\n"); F.close(); return "FAIL"; }

        var mk = seq.markers;
        if (!mk || !mk.numMarkers) { F.write("FAIL: no markers\n"); F.close(); return "FAIL"; }
        F.write("markers: " + mk.numMarkers + "\n");

        // Create output directory
        var DF = new Folder(outDir);
        if (!DF.exists) DF.create();

        // Save original I/O
        var oldIn = null, oldOut = null;
        try { oldIn = seq.getInPointAsTime(); } catch(e) {}
        try { oldOut = seq.getOutPointAsTime(); } catch(e) {}

        var ip = null, op = null;
        try { ip = seq.getInPointAsTime(); } catch(e) {}
        try { op = seq.getOutPointAsTime(); } catch(e) {}

        var preset = "D:\\test.epr";
        var ex = 0, sk = 0, fa = 0, idx = 0;
        var m = mk.getFirstMarker();

        while (m) {
            idx++;
            if (ip && op &&
                (Number(m.start.ticks) < Number(ip.ticks) ||
                 Number(m.start.ticks) > Number(op.ticks))) {
                sk++;
            } else {
                var mn = m.name ? m.name.replace(/[\\:*?"<>|]/g, "_") : ("M" + idx);
                var fp = outDir + "/" + mn + ".jpg";
                seq.setInPoint(m.start.seconds);
                seq.setOutPoint(m.start.seconds + 0.001);
                try {
                    var job = app.encoder.encodeSequence(seq, fp, preset, 1, 1, true);
                    F.write("[" + idx + "] " + fp + " job=" + job + "\n");
                    ex++;
                } catch(e2) {
                    F.write("FAIL[" + idx + "]: " + e2 + "\n");
                    fa++;
                }
            }
            m = mk.getNextMarker(m);
        }

        // Restore original I/O
        if (oldIn) { try { seq.setInPoint(oldIn.seconds); } catch(e) {} }
        if (oldOut) { try { seq.setOutPoint(oldOut.seconds); } catch(e) {} }

        F.write("=== done: ex=" + ex + " sk=" + sk + " fa=" + fa + " ===\n");
    } catch(e) {
        F.write("ERROR: " + e + "\n");
    }

    F.close();
    return "OK";
};

// 导出 FFmpeg 帧数据：收集标记→源文件时间映射，写 JSON 供 NAS 处理
$.hermes.exportFramesFFmpeg = function(outDir) {
    if (!outDir) outDir = "C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/screenshots";
    var LOG = "C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs/pr_export_log.txt";
    var logDir = new Folder("C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs");
    if (!logDir.exists) logDir.create();
    var F = new File(LOG);
    F.open("w");

    try {
        F.write("=== export FFmpeg JSON ===\n");
        var seq = app.project.activeSequence;
        if (!seq) { F.write("FAIL: no seq\n"); F.close(); return "FAIL"; }

        var mk = seq.markers;
        if (!mk || !mk.numMarkers) { F.write("FAIL: no markers\n"); F.close(); return "FAIL"; }

        // Create output directory
        var DF = new Folder(outDir);
        if (!DF.exists) DF.create();

        // Build source index: group clips by media path, compute cumulative source offsets
        var sources = {};
        var vt = seq.videoTracks;
        for (var t = 0; t < vt.numTracks; t++) {
            var tk = vt[t]; if (t > 0) continue; // V1 only
            for (var c = 0; c < tk.clips.numItems; c++) {
                var cl = tk.clips[c];
                var path = "";
                try { path = cl.projectItem.getMediaPath(); } catch(e) {}
                if (!path) path = cl.name;
                if (!sources[path]) sources[path] = [];
                sources[path].push({
                    seqStart: Number(cl.start.ticks),
                    seqEnd: Number(cl.end.ticks)
                });
            }
        }
        // Sort and compute cumulative source offsets per media file
        var srcOffsets = {};
        for (var p in sources) {
            var arr = sources[p];
            arr.sort(function(a, b) { return a.seqStart - b.seqStart; });
            var cum = 0;
            for (var i = 0; i < arr.length; i++) {
                arr[i].cumulative = cum;
                cum += (arr[i].seqEnd - arr[i].seqStart);
            }
            srcOffsets[p] = arr;
        }

        // Iterate markers in I/O, build JSON
        var ip = seq.getInPointAsTime();
        var op = seq.getOutPointAsTime();
        var items = [];
        var m = mk.getFirstMarker();
        var idx = 0;
        while (m) {
            idx++;
            var mt = Number(m.start.ticks);
            if (mt >= Number(ip.ticks) && mt <= Number(op.ticks)) {
                var mn = m.name ? m.name.replace(/[\\:*?"<>|]/g, "_") : ("M" + idx);
                // Find which source/clip this marker belongs to
                var found = false;
                for (var p in srcOffsets) {
                    var clips = srcOffsets[p];
                    for (var i = 0; i < clips.length; i++) {
                        if (mt >= clips[i].seqStart && mt <= clips[i].seqEnd) {
                            var sourceTicks = clips[i].cumulative + (mt - clips[i].seqStart);
                            var sourceSec = sourceTicks / 254016000000;
                            var fp = outDir + "/" + mn + ".jpg";
                            items.push({
                                name: mn,
                                sourceFile: p,
                                sourceTime: sourceSec,
                                outputPath: fp
                            });
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
                if (!found) F.write("MISS: " + mn + " at " + mt + "\n");
            }
            m = mk.getNextMarker(m);
        }

        F.write("found: " + items.length + " markers\n");

        // Detect SRT files next to source media
        var _srtCache = {};
        for (var _i = 0; _i < items.length; _i++) {
            var _src = items[_i].sourceFile;
            if (_srtCache[_src] === undefined) {
                _srtCache[_src] = "";
                var _ls = Math.max(_src.lastIndexOf("\\"), _src.lastIndexOf("/"));
                if (_ls >= 0) {
                    var _sDir = new Folder(_src.substring(0, _ls));
                    if (_sDir.exists) {
                        // Try exact base-name match with common SRT extensions
                        var _bn = _src.substring(_ls + 1);
                        var _di = _bn.lastIndexOf(".");
                        if (_di >= 0) _bn = _bn.substring(0, _di);
                        var _pats = [".srt", ".chs.srt", ".chi.srt", ".Chinese(Simple).srt"];
                        var _found = false;
                        for (var _si = 0; _si < _pats.length; _si++) {
                            var _tp = _sDir.fsName + "\\" + _bn + _pats[_si];
                            if (new File(_tp).exists) { _srtCache[_src] = _tp.split(String.fromCharCode(92)).join(String.fromCharCode(47)); _found = true; break; }
                        }
                        // Fallback: if exact match failed, grab any .srt in dir
                        if (!_found) {
                            var _anySrt = _sDir.getFiles("*.srt");
                            if (_anySrt.length > 0) {
                                _srtCache[_src] = _anySrt[0].fsName.split(String.fromCharCode(92)).join(String.fromCharCode(47));
                            }
                        }
                    }
                }
            }
            items[_i].subtitleFile = _srtCache[_src];
        }

        // Build JSON string for return + write backup file
        var j = "[";
        for (var i = 0; i < items.length; i++) {
            j += "{\"name\":\"" + items[i].name + "\",";
            j += "\"sourceFile\":\"" + items[i].sourceFile.replace(/\\/g, "\\\\") + "\",";
            j += "\"sourceTime\":" + items[i].sourceTime.toFixed(6) + ",";
            j += "\"outputPath\":\"" + items[i].outputPath.replace(/\\/g, "\\\\") + "\"";
            if (items[i].subtitleFile) {
                j += ",\"subtitleFile\":\"" + items[i].subtitleFile.replace(/\\/g, "\\\\") + "\"";
            }
            j += "}";
            if (i < items.length - 1) j += ",";
        }
        j += "]";
        // Also write file for backup / standalone use
        var jf = new File(outDir + "/_frames.json");
        jf.open("w"); jf.write(j); jf.close();

        F.write("json: " + outDir + "\\_frames.json\n");

        // Copy detected SRT to output dir for relative path access (avoids FFmpeg colon escaping)
        for (var _si2 = 0; _si2 < items.length; _si2++) {
            if (items[_si2].subtitleFile) {
                var _srtSrcFile = new File(items[_si2].subtitleFile.split(String.fromCharCode(47)).join(String.fromCharCode(92)));
                if (_srtSrcFile.exists) {
                    _srtSrcFile.copy(outDir + "/_sub.srt");
                    F.write("srt copied: " + outDir + "\\_sub.srt\n");
                }
                break;
            }
        }

                                                // Also generate standalone export_frames.ps1
        var ps = "$ff=$env:LOCALAPPDATA+'\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe'\n";
        ps += "$json=Join-Path $PSScriptRoot '_frames.json'\n";
        ps += "if(!(Test-Path $json)){Write-Host '_frames.json not found';Read-Host;exit 1}\n";
        ps += "$items=Get-Content $json -Raw -Encoding Default|ConvertFrom-Json\n";
        ps += "$n=$items.Count;Write-Host \"Total: $n\";$ok=0;$fail=0\n";
        ps += "$subFile=Join-Path $PSScriptRoot '_sub.srt'\n";
        ps += "$hasSub=Test-Path $subFile\n";
        ps += "foreach($it in $items){\n";
        ps += "  $d=Split-Path $it.outputPath -Parent;if(!(Test-Path $d)){mkdir $d -Force|Out-Null}\n";
        ps += "  if($hasSub){\n";
        ps += "    $a=@('-y','-copyts','-start_at_zero','-ss',\"$($it.sourceTime)\",'-i',$it.sourceFile,'-vf',\"subtitles=_sub.srt\",'-update','1','-vframes','1',$it.outputPath,'-loglevel','error')\n";
        ps += "  }else{\n";
        ps += "    $a=@('-y','-copyts','-start_at_zero','-ss',\"$($it.sourceTime)\",'-i',$it.sourceFile,'-update','1','-vframes','1',$it.outputPath,'-loglevel','error')\n";
        ps += "  }\n";
        ps += "  & $ff $a 2>&1|Out-Null;if($LASTEXITCODE -eq 0){$ok++}else{$fail++}\n";
        ps += "  if(($ok+$fail)%10 -eq 0){Write-Host \"  $($ok+$fail)/$n (ok=$ok)\"}\n";
        ps += "}\n";
        ps += "Write-Host \"Done: $ok ok, $fail fail\"\n";
        ps += "Read-Host 'Press Enter to close'\n";
        var bf = new File(outDir + "/export_frames.ps1");
        bf.open("w"); bf.write(ps); bf.close();






        F.write("ps1: " + outDir + "\\export_frames.ps1\n");
        F.write("=== done ===\n");
        F.close();
        return j;
    } catch(e) {
        F.write("ERROR: " + e + "\n");
        F.close();
        return "FAIL: " + e;
    }
};

// 重命名标记：按 clip 重新编号 C{clip序号}-{marker序号}
$.hermes.renameMarkers = function() {
    var LOG = "C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs/pr_log.txt";
    var logDir = new Folder("C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs");
    if (!logDir.exists) logDir.create();
    var F = new File(LOG);
    F.open("w");

    try {
        F.write("=== rename markers ===\n");
        var seq = app.project.activeSequence;
        if (!seq) { F.write("FAIL: no seq\n"); F.close(); return "FAIL"; }

        var ip = seq.getInPointAsTime();
        var op = seq.getOutPointAsTime();
        F.write("I/O: " + ip.seconds.toFixed(1) + " - " + op.seconds.toFixed(1) + "\n");

        // 收集 I/O 范围内所有 clip
        var clips = [];
        var vt = seq.videoTracks;
        for (var t = 0; t < vt.numTracks; t++) {
            var tk = vt[t];
            for (var c = 0; c < tk.clips.numItems; c++) {
                var cl = tk.clips[c];
                var cs = Number(cl.start.ticks);
                var ce = Number(cl.end.ticks);
                if (ce <= Number(ip.ticks) || cs >= Number(op.ticks)) continue;
                clips.push({s: cs, e: ce});
            }
        }
        clips.sort(function(a, b) { return a.s - b.s; });
        F.write("clips in I/O: " + clips.length + "\n");

        // 收集所有标记
        var mk = seq.markers;
        var markers = [];
        var m = mk.getFirstMarker();
        while (m) {
            markers.push({obj: m, t: Number(m.start.ticks)});
            m = mk.getNextMarker(m);
        }
        F.write("markers total: " + markers.length + "\n");

        // 每个 clip 内找标记，编序号
        var renamed = 0;
        for (var i = 0; i < clips.length; i++) {
            var cl = clips[i];
            var clipMarkers = [];
            for (var j = 0; j < markers.length; j++) {
                if (markers[j].t >= cl.s && markers[j].t <= cl.e) {
                    clipMarkers.push(markers[j]);
                }
            }
            clipMarkers.sort(function(a, b) { return a.t - b.t; });
            for (var k = 0; k < clipMarkers.length; k++) {
                var newName = "C" + (i + 1) + "-" + (k + 1);
                clipMarkers[k].obj.name = newName;
                renamed++;
            }
        }

        F.write("=== renamed: " + renamed + " ===\n");
    } catch(e) {
        F.write("ERROR: " + e + "\n");
    }

    F.close();
    return "OK";
};

// 命令通道：由 CEP 面板定时调用，检查 NAS 发来的命令
$.hermes.checkCmd = function() {
    var cmdFile = new File("C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs/_hermes_cmd.txt");
    if (!cmdFile.exists) return "NOP";
    
    cmdFile.open("r");
    var cmd = cmdFile.read();
    cmdFile.close();
    
    if (!cmd || cmd.length < 1) return "NOP";
    
    // Execute and capture result
    var result = "NOP";
    try {
        result = eval(cmd);
        if (result === undefined) result = "OK (undefined)";
    } catch(e) {
        result = "ERROR: " + e;
    }
    
    // Write result
    var resFile = new File("C:/Users/54718/AppData/Roaming/Adobe/CEP/extensions/pr-storyboard-tool/logs/_hermes_result.txt");
    resFile.open("w");
    resFile.write(String(result));
    resFile.close();
    
    // Delete command file
    cmdFile.remove();
    
    return String(result).substring(0, 200);
};

// 执行多行 ExtendScript 脚本文件，返回结果
$.hermes.exec = function(scriptPath) {
    var F = new File(scriptPath);
    if (!F.exists) return "NO FILE: " + scriptPath;
    F.open("r");
    var code = F.read();
    F.close();
    if (!code || code.length < 1) return "EMPTY FILE";
    try {
        var result = eval(code);
        return String(result);
    } catch(e) {
        return "ERROR: " + e;
    }
};