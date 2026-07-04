/**
 * standalone_export.jsx - 拖到 PR 窗口上运行
 * 遍历当前序列所有标记，导出 JPG 截图到桌面 screenshots/
 */
var seq = app.project.activeSequence;
if (!seq) { alert("No active sequence!"); }

var mk = seq.markers;
if (!mk || !mk.numMarkers) { alert("No markers!"); }

var outDir = new Folder("C:/Users/54718/Desktop/screenshots");
if (!outDir.exists) outDir.create();

var LOG = new File("C:/Users/54718/Desktop/pr_export_log.txt");
LOG.open("w");
LOG.write("=== standalone export ===\n");
LOG.write("seq: " + seq.name + "\n");
LOG.write("markers: " + mk.numMarkers + "\n");

// Save original I/O
var oldIn = null, oldOut = null;
try { oldIn = seq.getInPointAsTime(); } catch(e) {}
try { oldOut = seq.getOutPointAsTime(); } catch(e) {}

var ex = 0, fa = 0, idx = 0;
var m = mk.getFirstMarker();
var presetPath = "C:/Program Files/Adobe/Adobe Media Encoder 2025/MediaIO/systempresets/3F3F3F3F_4A504547/JPEG Sequence (Match Source).epr";

while (m) {
    idx++;
    var mn = m.name ? m.name.replace(/[\\:*?"<>|]/g, "_") : ("M" + idx);
    var fp = "C:/Users/54718/Desktop/screenshots/" + mn + ".jpg";
    try {
        seq.setInPoint(m.start.seconds);
        seq.setOutPoint(m.start.seconds + 0.04);
        
        // Try exportAsMediaDirect
        var r = seq.exportAsMediaDirect(fp, presetPath, 1);
        if (r && String(r).indexOf("Error") === 0) {
            // Fallback: try QE
            app.enableQE();
            var qs = qe.project.getActiveSequence();
            seq.setPlayerPosition(m.start.ticks);
            qs.exportFrameJPEG(qs.CTI.timecode, fp);
        }
        LOG.write("[" + idx + "] " + fp + " result=" + r + "\n");
        ex++;
    } catch(e) {
        LOG.write("FAIL[" + idx + "]: " + e + "\n");
        fa++;
    }
    m = mk.getNextMarker(m);
}

// Restore I/O
if (oldIn) { try { seq.setInPoint(oldIn.seconds); } catch(e) {} }
if (oldOut) { try { seq.setOutPoint(oldOut.seconds); } catch(e) {} }

LOG.write("=== done: ex=" + ex + " fa=" + fa + " ===\n");
LOG.close();

alert("Done! Exported: " + ex + ", Failed: " + fa + "\nCheck pr_export_log.txt on Desktop");
