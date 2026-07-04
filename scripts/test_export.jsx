/**
 * test_export.jsx - 独立测试脚本
 * 放到 PR Scripts 目录，从 PR 菜单 File > Scripts > test_export.jsx 运行
 * 测试 exportFrameJPEG 在独立 JSX 上下文是否可用
 */
app.enableQE();
var seq = app.project.activeSequence;
if (!seq) { alert("no active sequence"); }

var qs = qe.project.getActiveSequence();
if (!qs) { alert("QE failed"); }

// test: export current frame to desktop
var fp = "C:/Users/54718/Desktop/test_export.jpg";
try {
    qs.exportFrameJPEG(qs.CTI.timecode, fp);
    alert("OK: " + fp);
} catch(e) {
    alert("FAIL: " + e);
}
