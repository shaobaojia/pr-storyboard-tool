/**
 * test_export_frame.jsx
 * 在 VS Code 中打开此文件，按 F5 即可在 PR 中执行
 * 不需要 CEP 面板，直接连接 PR 原生 ExtendScript 引擎
 */

var LOG = new File("C:/Users/54718/Desktop/pr_export_log.txt");
LOG.open("w");
LOG.write("=== VS Code debug export ===\n");

var seq = app.project.activeSequence;
if (!seq) {
    LOG.write("FAIL: no active sequence\n");
    LOG.close();
    $.writeln("FAIL: no active sequence");
} else {
    LOG.write("seq: " + seq.name + "\n");
    
    var mk = seq.markers;
    if (!mk || !mk.numMarkers) {
        LOG.write("FAIL: no markers\n");
    } else {
        LOG.write("markers: " + mk.numMarkers + "\n");
        
        // Save original I/O
        var oldIn = null, oldOut = null;
        try { oldIn = seq.getInPointAsTime(); } catch(e) {}
        try { oldOut = seq.getOutPointAsTime(); } catch(e) {}
        
        // Export first marker
        var m = mk.getFirstMarker();
        var mn = m.name ? m.name.replace(/[\\:*?"<>|]/g, "_") : "M1";
        var fp = "C:/Users/54718/Desktop/screenshots/" + mn + ".jpg";
        
        // Create output folder
        var DF = new Folder("C:/Users/54718/Desktop/screenshots");
        if (!DF.exists) DF.create();
        
        // Move CTI to marker
        seq.setPlayerPosition(m.start.ticks);
        LOG.write("marker at: " + m.start.seconds.toFixed(1) + "s\n");
        
        // Set in/out to single frame
        seq.setInPoint(m.start.seconds);
        seq.setOutPoint(m.start.seconds + 0.04);
        
        // Try exportAsMediaDirect with desktop preset
        var presetPath = "C:/Users/54718/Desktop/test_preset.epr";
        LOG.write("preset: " + presetPath + "\n");
        
        var r = seq.exportAsMediaDirect(fp, presetPath, 1);
        LOG.write("exportAsMediaDirect: " + r + "\n");
        $.writeln("exportAsMediaDirect result: " + r);
        
        // Restore original I/O
        if (oldIn) { try { seq.setInPoint(oldIn.seconds); } catch(e) {} }
        if (oldOut) { try { seq.setOutPoint(oldOut.seconds); } catch(e) {} }
    }
    
    LOG.write("=== done ===\n");
}

LOG.close();
$.writeln("Script complete. Check pr_export_log.txt");
