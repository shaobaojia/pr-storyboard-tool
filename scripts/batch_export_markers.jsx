/**
 * 导出 I/O 范围内所有标记位的截图
 * 放到 PR Scripts 目录，从 PR 菜单直接运行
 */
(function() {
    var seq = app.project.activeSequence;
    if (!seq) { alert("没有活动序列"); return; }

    function GI(s) { try { return s.getInPoint(); } catch(e) {} try { return s.inPoint; } catch(e) {} return { ticks: 0 }; }
    function GO(s) { try { return s.getOutPoint(); } catch(e) {} try { return s.outPoint; } catch(e) {} return { ticks: 1e15 }; }

    var ip = GI(seq), op = GO(seq);
    var mk = seq.markers;
    if (!mk || mk.numMarkers === 0) { alert("时间线上没有标记"); return; }

    var dir = Folder.selectDialog("选择截图保存目录");
    if (!dir) return;

    app.enableQE();
    var qs = qe.project.getActiveSequence();
    if (!qs) { alert("无法获取序列"); return; }

    function S(n) { return n.replace(/[\\/:*?"<>|]/g, "_"); }
    function P(n, w) { var s = n.toString(); while (s.length < w) s = "0" + s; return s; }

    var sn = S(seq.name);
    var ex = 0, sk = 0, fa = 0, idx = 0;
    var m = mk.getFirstMarker();

    while (m) {
        idx++;
        if (m.start.ticks < ip.ticks || m.start.ticks > op.ticks) {
            sk++; m = mk.getNextMarker(m); continue;
        }
        var mn = m.name ? S(m.name) : "M" + P(idx, 3);
        var fp = dir.fsName + "/" + sn + "_" + mn + ".jpg";
        try {
            qs.setPlayerPosition(m.start.ticks);
            qs.exportFrameJPEG(qs.CTI.timecode, fp);
            ex++;
        } catch(e) { fa++; }
        m = mk.getNextMarker(m);
    }

    alert("完成！\n导出: " + ex + "\n跳过(范围外): " + sk + "\n失败: " + fa + "\n\n" + dir.fsName);
})();
