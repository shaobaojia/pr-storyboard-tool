/**
 * 自动在 I/O 范围内每个 clip 均匀打 M 标记
 * 放到 PR Scripts 目录，从 PR 菜单直接运行
 */
(function() {
    var seq = app.project.activeSequence;
    if (!seq) { alert("没有活动序列"); return; }

    var mpc = parseInt(prompt("每镜头打几个标记？", "3"), 10);
    if (isNaN(mpc) || mpc < 1 || mpc > 20) { alert("请输入 1~20"); return; }

    function GI(s) { try { return s.getInPoint(); } catch(e) {} try { return s.inPoint; } catch(e) {} return { ticks: 0, seconds: 0 }; }
    function GO(s) { try { return s.getOutPoint(); } catch(e) {} try { return s.outPoint; } catch(e) {} return { ticks: 1e15, seconds: 99999 }; }

    var ip = GI(seq), op = GO(seq);
    if (ip.ticks >= op.ticks) { alert("请先用 I/O 框选范围"); return; }

    var clips = [];
    var vt = seq.videoTracks;
    for (var t = 0; t < vt.numTracks; t++) {
        var tk = vt[t];
        for (var c = 0; c < tk.clips.numItems; c++) {
            var cl = tk.clips[c];
            if (cl.end.ticks <= ip.ticks || cl.start.ticks >= op.ticks) continue;
            if (cl.end.seconds - cl.start.seconds < 0.04) continue;
            var es = Math.max(cl.start.ticks, ip.ticks);
            var ee = Math.min(cl.end.ticks, op.ticks);
            if (ee - es < 1) continue;
            clips.push({ s: es, e: ee, d: ee - es });
        }
    }
    if (!clips.length) { alert("I/O 范围内无 clip"); return; }
    clips.sort(function(a, b) { return a.s - b.s; });

    var mk = seq.markers, tot = 0;
    for (var i = 0; i < clips.length; i++) {
        var cl = clips[i];
        for (var j = 1; j <= mpc; j++) {
            var frac = j / (mpc + 1);
            var mt = cl.s + Math.round(cl.d * frac);
            var m = mk.createMarker(mt);
            if (m) { m.name = "C" + (i + 1) + "-" + j; tot++; }
        }
    }
    alert("完成！\n镜头: " + clips.length + "\n标记: " + tot + "\n\n请检查/调整标记位置，然后运行「导出截图」");
})();
