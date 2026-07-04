$.hermes = {};

$.hermes.autoPlace = function(mpc) {
    var LOG = "C:/Users/54718/Desktop/pr_log.txt";
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

$.hermes.exportFrames = function() {
    var LOG = "C:/Users/54718/Desktop/pr_export_log.txt";
    var F = new File(LOG);
    F.open("w");
    var ok = true;

    try {
        F.write("=== export ===\n");
        var outDir = "C:/Users/54718/Desktop/screenshots";
        var DF = new Folder(outDir);
        if (!DF.exists) DF.create();

        var seq = app.project.activeSequence;
        if (!seq) { F.write("FAIL: no seq\n"); ok = false; }

        if (ok) {
            F.write("seq: " + seq.name + "\n");
            var mk = seq.markers;
            if (!mk || !mk.numMarkers) {
                F.write("FAIL: no markers\n");
                ok = false;
            }

            if (ok) {
                F.write("markers: " + mk.numMarkers + "\n");
                F.write("init QE...\n");
                app.enableQE();
                var qs = qe.project.getActiveSequence();
                if (!qs) { F.write("FAIL: QE\n"); ok = false; }

                if (ok) {
                    var ip = null, op = null;
                    try { ip = seq.getInPointAsTime(); } catch(e2) {}
                    try { op = seq.getOutPointAsTime(); } catch(e2) {}

                    var sn = seq.name.replace(/[\\:*?"<>|]/g, "_");
                    var ex = 0, fa = 0, sk = 0, idx = 0;
                    var m = mk.getFirstMarker();

                    while (m) {
                        idx++;
                        if (ip && op &&
                            (Number(m.start.ticks) < Number(ip.ticks) ||
                             Number(m.start.ticks) > Number(op.ticks))) {
                            sk++;
                        } else {
                            var mn = m.name ? m.name.replace(/[\\:*?"<>|]/g, "_") : ("M" + idx);
                            var fp = outDir + "/" + sn + "_" + mn + ".jpg";
                            try {
                                qs.setPlayerPosition(m.start.ticks);
                                qs.exportFrameJPEG(qs.CTI.timecode, fp);
                                ex++;
                            } catch(e2) {
                                F.write("FAIL[" + idx + "]: " + e2 + "\n");
                                fa++;
                            }
                        }
                        m = mk.getNextMarker(m);
                    }
                    F.write("=== done: ex=" + ex + " sk=" + sk + " fa=" + fa + " ===\n");
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
