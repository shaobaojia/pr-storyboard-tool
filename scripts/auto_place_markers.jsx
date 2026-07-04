/**
 * auto_place_markers.jsx
 * 在入出点范围内，每个 Clip 内均匀放置 M 标记
 * 
 * markersPerClip 通过 $.global.markersPerClip 传入（面板设置）
 * 入出点范围自动读取序列的 I/O
 */

(function main() {
    var sequence = app.project.activeSequence;
    if (!sequence) {
        alert("没有打开的活动序列。", "拉片截图工具");
        return;
    }

    // ── 每镜头标记数（面板传入，兜底 3）──
    var markersPerClip = 3;
    if ($.global && $.global.markersPerClip) {
        markersPerClip = parseInt($.global.markersPerClip, 10);
    }
    if (isNaN(markersPerClip) || markersPerClip < 1 || markersPerClip > 20) {
        markersPerClip = 3;
    }

    // ── 读取入出点 ──
    var inPoint = getInPoint(sequence);
    var outPoint = getOutPoint(sequence);

    if (inPoint.ticks >= outPoint.ticks) {
        alert("入点和出点无效。请先用 I / O 键框选一场戏的范围。", "拉片截图工具");
        return;
    }

    // ── 收集入出点范围内的 clip ──
    var allClips = [];
    var videoTracks = sequence.videoTracks;

    for (var t = 0; t < videoTracks.numTracks; t++) {
        var track = videoTracks[t];
        for (var c = 0; c < track.clips.numItems; c++) {
            var clip = track.clips[c];

            // 跳过完全在范围外的
            if (clip.end.ticks <= inPoint.ticks || clip.start.ticks >= outPoint.ticks) continue;
            // 跳过极短的 clip
            if (clip.end.seconds - clip.start.seconds < 0.04) continue;

            var effStart = Math.max(clip.start.ticks, inPoint.ticks);
            var effEnd   = Math.min(clip.end.ticks, outPoint.ticks);
            var effDuration = effEnd - effStart;
            if (effDuration < 1) continue;

            allClips.push({
                effStart: effStart,
                effEnd: effEnd,
                duration: effDuration,
                origStartSec: clip.start.seconds,
                origEndSec: clip.end.seconds,
                name: clip.name,
                trackIndex: t
            });
        }
    }

    if (allClips.length === 0) {
        alert("入出点范围内没有视频片段。", "拉片截图工具");
        return;
    }

    allClips.sort(function(a, b) { return a.effStart - b.effStart; });

    // ── 打标 ──
    var markers = sequence.markers;
    var totalPlaced = 0;

    $.writeln("========== 自动打标记 ==========");
    $.writeln("序列: " + sequence.name);
    $.writeln("范围: " + ticksToTC(inPoint.ticks) + " → " + ticksToTC(outPoint.ticks));
    $.writeln("每镜头: " + markersPerClip + " 个标记");
    $.writeln("镜头数: " + allClips.length);
    $.writeln("");

    for (var i = 0; i < allClips.length; i++) {
        var clip = allClips[i];
        for (var j = 1; j <= markersPerClip; j++) {
            var fraction = j / (markersPerClip + 1);
            var markerTicks = clip.effStart + Math.round(clip.duration * fraction);

            var marker = markers.createMarker(markerTicks);
            if (marker) {
                marker.name = "C" + (i + 1) + "-" + j;
                totalPlaced++;
            }
        }
        $.writeln(
            "C" + pad(i + 1, 3) + " | " +
            secToTC(clip.origStartSec) + " → " + secToTC(clip.origEndSec) +
            " | " + markersPerClip + " 标记"
        );
    }

    $.writeln("");
    $.writeln("完成: " + totalPlaced + " 个标记已放置（仅在 I/O 范围内）");

    alert(
        "✅ 自动打标完成！\n\n" +
        "范围内镜头: " + allClips.length + "\n" +
        "标记数: " + totalPlaced + "\n" +
        "每镜头: " + markersPerClip + " 个\n\n" +
        "请手动检查/调整标记位置，\n" +
        "然后点击「导出截图」。",
        "拉片截图工具"
    );
})();

// ============================================================
// 序列入出点
// ============================================================

function getInPoint(sequence) {
    try { return sequence.getInPoint(); } catch(e) {}
    try { return sequence.inPoint; } catch(e) {}
    return { ticks: 0, seconds: 0 };
}

function getOutPoint(sequence) {
    try { return sequence.getOutPoint(); } catch(e) {}
    try { return sequence.outPoint; } catch(e) {}
    return { ticks: sequence.end || Number.MAX_VALUE, seconds: 99999 };
}

// ============================================================
// 工具
// ============================================================

function pad(num, w) {
    var s = num.toString();
    while (s.length < w) s = "0" + s;
    return s;
}

function secToTC(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var f = Math.floor((seconds % 1) * 30);
    return pad(h, 2) + ":" + pad(m, 2) + ":" + pad(s, 2) + "." + pad(f, 2);
}

function ticksToTC(ticks) {
    return secToTC(ticks / 254016000000);
}
