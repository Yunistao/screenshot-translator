"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSelectionExportBlob = exports.renderSelectionExport = void 0;
const loadImage = (imageData) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
});
const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
};
const drawAnnotations = (ctx, annotations, selectionArea) => {
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const annotation of annotations) {
        ctx.strokeStyle = annotation.color;
        ctx.fillStyle = annotation.color;
        switch (annotation.type) {
            case 'rectangle':
                if (annotation.startX !== undefined &&
                    annotation.startY !== undefined &&
                    annotation.endX !== undefined &&
                    annotation.endY !== undefined) {
                    const x = Math.min(annotation.startX, annotation.endX) - selectionArea.x;
                    const y = Math.min(annotation.startY, annotation.endY) - selectionArea.y;
                    const width = Math.abs(annotation.endX - annotation.startX);
                    const height = Math.abs(annotation.endY - annotation.startY);
                    ctx.strokeRect(x, y, width, height);
                }
                break;
            case 'arrow':
                if (annotation.startX !== undefined &&
                    annotation.startY !== undefined &&
                    annotation.endX !== undefined &&
                    annotation.endY !== undefined) {
                    drawArrow(ctx, annotation.startX - selectionArea.x, annotation.startY - selectionArea.y, annotation.endX - selectionArea.x, annotation.endY - selectionArea.y);
                }
                break;
            case 'brush':
                if (annotation.points && annotation.points.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(annotation.points[0].x - selectionArea.x, annotation.points[0].y - selectionArea.y);
                    annotation.points.slice(1).forEach((point) => {
                        ctx.lineTo(point.x - selectionArea.x, point.y - selectionArea.y);
                    });
                    ctx.stroke();
                }
                break;
        }
    }
};
const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    const nextRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + nextRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, nextRadius);
    ctx.arcTo(x + width, y + height, x, y + height, nextRadius);
    ctx.arcTo(x, y + height, x, y, nextRadius);
    ctx.arcTo(x, y, x + width, y, nextRadius);
    ctx.closePath();
};
const wrapText = (ctx, text, maxWidth) => {
    if (!text.trim()) {
        return [];
    }
    const characters = Array.from(text);
    const lines = [];
    let currentLine = '';
    for (const character of characters) {
        const candidate = `${currentLine}${character}`;
        if (currentLine && ctx.measureText(candidate).width > maxWidth) {
            lines.push(currentLine);
            currentLine = character;
            continue;
        }
        currentLine = candidate;
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
};
const drawTranslationOverlay = (ctx, ocrLines) => {
    const translatedLines = ocrLines.filter((line) => line.translatedText?.trim());
    if (translatedLines.length === 0) {
        return;
    }
    ctx.save();
    ctx.font = '12px Arial';
    ctx.textBaseline = 'top';
    for (const line of translatedLines) {
        const boxWidth = Math.max(40, line.bbox.x1 - line.bbox.x0);
        const minHeight = Math.max(20, line.bbox.y1 - line.bbox.y0);
        const x = line.bbox.x0;
        const y = line.bbox.y0;
        const paddingX = 4;
        const paddingY = 2;
        const lineHeight = 16;
        const wrappedLines = wrapText(ctx, line.translatedText, Math.max(24, boxWidth - paddingX * 2));
        const boxHeight = Math.max(minHeight, wrappedLines.length * lineHeight + paddingY * 2);
        ctx.fillStyle = 'rgba(15, 15, 15, 0.86)';
        drawRoundedRect(ctx, x, y, boxWidth, boxHeight, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.65)';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, x, y, boxWidth, boxHeight, 4);
        ctx.stroke();
        ctx.fillStyle = '#f5f7fa';
        wrappedLines.forEach((textLine, index) => {
            ctx.fillText(textLine, x + paddingX, y + paddingY + index * lineHeight);
        });
    }
    ctx.restore();
};
const renderSelectionExport = async ({ screenshotImage, selectionArea, annotations = [], ocrLines = [], includeTranslation = false, }) => {
    const img = await loadImage(screenshotImage);
    const canvas = document.createElement('canvas');
    canvas.width = selectionArea.width;
    canvas.height = selectionArea.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }
    ctx.drawImage(img, selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height, 0, 0, selectionArea.width, selectionArea.height);
    if (annotations.length > 0) {
        drawAnnotations(ctx, annotations, selectionArea);
    }
    if (includeTranslation) {
        drawTranslationOverlay(ctx, ocrLines);
    }
    return canvas.toDataURL('image/png');
};
exports.renderSelectionExport = renderSelectionExport;
const renderSelectionExportBlob = async (options) => {
    const imageData = await (0, exports.renderSelectionExport)(options);
    const response = await fetch(imageData);
    return response.blob();
};
exports.renderSelectionExportBlob = renderSelectionExportBlob;
//# sourceMappingURL=selectionExport.js.map