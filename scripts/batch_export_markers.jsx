/**
 * batch_export_markers.jsx
 * 一键导出时间线上入出点范围内所有标记位的截图
 * 
 * 输出命名: {序列名}_{标记名}.jpg
 */

(function main() {
    var sequence = app.project.activeSequence;
    if (!sequence) {
        alert("没有打开的活动序列。", "拉片截图工具");
        return;
    }

    // ── 读取入出点 ──
    var inPoint = getInPoint(sequence);
    var outPoint = getOutPoint(sequence);

    // ── 检查标记 ──
    var markers = sequence.markers;
    if (!markers || markers.numMarkers === 0) {
        alert("时间线上没有标记。请先点击「自动打标记」。", "拉片截图工具");
        return;
    }

    // ── 选输出目录 ──
    var outputFolder = Folder.selectDialog("选择截图保存目录");
    if (!outputFolder) return;

    // ── 启用 QE DOM ──
    app.enableQE();
    var qeSeq = qe.project.getActiveSequence();
    if (!qeSeq) {
        alert("无法获取活动序列。", "拉片截图工具");
        return;
    }

    // ── 遍历标记，只导出范围内的 ──
    var seqName = sanitize(sequence.name);
    var totalMarkers = markers.numMarkers;
    var exported = 0;
    var skipped = 0;
    var failed = 0;
    var index = 0;

    $.writeln("========== 导出截图 ==========");
    $.writeln("序列: " + sequence.name);
    $.writeln("范围: " + ticksToTC(inPoint.ticks) + " → " + ticksToTC(outPoint.ticks));
    $.writeln("总标记: " + totalMarkers);
    $.writeln("输出: " + outputFolder.fsName);
    $.writeln("");

    var m = markers.getFirstMarker();
    while (m !== undefined) {
        index++;

        // 跳过范围外的标记
        if (m.start.ticks < inPoint.ticks || m.start.ticks > outPoint.ticks) {
            skipped++;
            m = markers.getNextMarker(m);
            continue;
        }

        var mName = m.name ? sanitize(m.name) : "M" + pad(index, 3);
        var filename = seqName + "_" + mName + ".jpg";
        var filePath = outputFolder.fsName + "/" + filename;

        try {
            qeSeq.setPlayerPosition(m.start.ticks);
            var tc = qeSeq.CTI.timecode;
            qeSeq.exportFrameJPEG(tc, filePath);
            $.writeln("[" + index + "] OK  " + filename);
            exported++;
        } catch (e) {
            $.writeln("[" + index + "] FAIL  " + filename + "  " + e);
            failed++;
        }

        m = markers.getNextMarker(m);
    }

    $.writeln("");
    $.writeln("导出: " + exported + " | 跳过(范围外): " + skipped + " | 失败: " + failed);
    $.writeln("========== 完成 ==========");

    alert(
        "✅ 导出完成！\n\n" +
        "导出: " + exported + " 张\n" +
        "跳过(范围外): " + skipped + " 个\n" +
        "失败: " + failed + " 张\n\n" +
        "保存位置:\n" + outputFolder.fsName,
        "拉片截图工具"
    );
})();

// ============================================================
// 序列入出点
// ============================================================

function getInPoint(sequence) {
    try { return sequence.getInPoint(); } catch(e) {}
    try { return sequence.inPoint; } catch(e) {}
    return { ticks: 0 };
}

function getOutPoint(sequence) {
    try { return sequence.getOutPoint(); } catch(e) {}
    try { return sequence.outPoint; } catch(e) {}
    return { ticks: sequence.end || Number.MAX_VALUE };
}

// ============================================================
// 工具
// ============================================================

function sanitize(name) {
    return name.replace(/[\\/:*?"<>|]/g, "_");
}

function pad(num, w) {
    var s = num.toString();
    while (s.length < w) s = "0" + s;
    return s;
}

function ticksToTC(ticks) {
    return secToTC(ticks / 254016000000);
}

function secToTC(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var f = Math.floor((seconds % 1) * 30);
    return pad(h, 2) + ":" + pad(m, 2) + ":" + pad(s, 2) + "." + pad(f, 2);
}
