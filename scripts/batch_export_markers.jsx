/**
 * batch_export_markers.jsx — 面板启动时加载，注册全局函数 $.exportMarkers()
 */
$.exportMarkers = function() {
    var LOG = "C:/Users/54718/Desktop/pr_export_log.txt";
    var F = new File(LOG);
    F.open("w");

    function A(s) { F.write(s + "\n"); $.writeln(s); }

    A("=== 导出截图 ===");

    var outDir = "C:/Users/54718/Desktop/screenshots";
    var DF = new Folder(outDir);
    if (!DF.exists) DF.create();
    A("目录: " + outDir);

    var seq = app.project.activeSequence;
    if (!seq) { A("FAIL: no seq"); F.close(); return; }
    A("序列: " + seq.name);

    var mk = seq.markers;
    if (!mk || !mk.numMarkers) { A("FAIL: no markers"); F.close(); return; }
    A("标记总数: " + mk.numMarkers);

    A("初始化 QE...");
    app.enableQE();
    var qs = qe.project.getActiveSequence();
    if (!qs) { A("FAIL: QE"); F.close(); return; }
    A("QE OK");

    function S(n) { return n.replace(/[\\/:*?"<>|]/g, "_"); }
    var sn = S(seq.name);
    var ex = 0, fa = 0, idx = 0;
    var m = mk.getFirstMarker();

    A("开始导出...");
    while (m) {
        idx++;
        var mn = m.name ? S(m.name) : "M" + idx;
        var fp = outDir + "/" + sn + "_" + mn + ".jpg";
        try {
            qs.setPlayerPosition(m.start.ticks);
            qs.exportFrameJPEG(qs.CTI.timecode, fp);
            ex++;
        } catch(e) {
            A("FAIL[" + idx + "]: " + fp + " " + e);
            fa++;
        }
        if (idx % 10 === 0) A("  " + idx + "/" + mk.numMarkers + " ok:" + ex + " fail:" + fa);
        m = mk.getNextMarker(m);
    }

    A("=== 完成: 导出 " + ex + ", 失败 " + fa + " ===");
    F.close();
    alert("导出完成!\n成功: " + ex + "\n失败: " + fa + "\n\n保存位置: " + outDir);
};
