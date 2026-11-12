(() => {
  'use strict';

  const frameCount = 12;
  const cycle = Math.PI * 2;
  const atlases = new WeakMap();

  // Coordinates are in the original artwork's normalized square. Every pose
  // shares the same canvas and anchor, including transparent padding.
  const legs = [
    [[.33, .63], [.48, .60], [.54, .68], [.52, .91], [.30, .93]],
    [[.58, .63], [.71, .64], [.78, .84], [.56, .85], [.54, .74]],
  ];
  const sword = [[.35, .44], [.49, .42], [.54, .53], [.93, .43], [.95, .47],
    [.85, .54], [.57, .63], [.48, .69], [.39, .66], [.35, .57]];
  const wings = [
    [[0, .10], [.36, .23], [.50, .41], [.53, .48], [.50, .58], [.34, .60], [0, .48]],
    [[1, .10], [.69, .23], [.63, .40], [.63, .52], [.74, .50], [1, .40]],
  ];

  function polygon(ctx, points) {
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
  }

  function layer(ctx, image, mask, x, y, angle, shiftY = 0) {
    ctx.save();
    ctx.translate(x, y + shiftY);
    ctx.rotate(angle);
    ctx.translate(-x, -y);
    ctx.beginPath();
    polygon(ctx, mask);
    ctx.clip();
    ctx.drawImage(image, 0, 0, 1, 1);
    ctx.restore();
  }

  function drawBody(ctx, image, masks) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 1, 1);
    for (const mask of masks) polygon(ctx, mask);
    ctx.clip('evenodd');
    ctx.drawImage(image, 0, 0, 1, 1);
    ctx.restore();
  }

  function buildAtlas(image, motion) {
    const size = motion === 'fly' ? 256 : 128;
    const masks = motion === 'fly' ? wings : motion === 'strike' ? [sword] : legs;
    const atlas = document.createElement('canvas');
    atlas.width = size * frameCount;
    atlas.height = size;
    const ctx = atlas.getContext('2d');
    for (let i = 0; i < frameCount; i++) {
      const wave = Math.sin(i / frameCount * cycle);
      ctx.save();
      ctx.beginPath();
      ctx.rect(i * size, 0, size, size);
      ctx.clip();
      ctx.translate(i * size + size * .06, size * .06);
      ctx.scale(size * .88, size * .88);
      if (motion === 'fly') {
        layer(ctx, image, masks[0], .50, .47, wave * .34);
        layer(ctx, image, masks[1], .64, .43, -wave * .42);
      } else if (motion === 'walk') {
        layer(ctx, image, masks[1], .63, .65, -.22 * wave, Math.min(0, wave) * .035);
        layer(ctx, image, masks[0], .45, .64, .27 * wave, -Math.max(0, wave) * .035);
      }
      drawBody(ctx, image, masks);
      if (motion === 'strike') {
        const progress = i / (frameCount - 1);
        const swing = progress < .4
          ? -.55 * Math.sin(progress / .4 * Math.PI / 2)
          : .57 * Math.sin((progress - .4) / .6 * Math.PI * 1.4 - 1.3);
        layer(ctx, image, sword, .43, .48, progress === 1 ? 0 : swing);
      }
      ctx.restore();
    }
    return { atlas, size };
  }

  function prepare(image, motion) {
    let poses = atlases.get(image);
    if (!poses) {
      poses = {};
      atlases.set(image, poses);
    }
    return poses[motion] ??= buildAtlas(image, motion);
  }

  function drawUnit(ctx, image, unit, meta, now, attack, low) {
    let motion;
    if (unit.spec.lord && !low) motion = 'fly';
    if (unit.tier === 'soldier') {
      if (attack > 0) motion = 'strike';
      else if (unit.moving) motion = 'walk';
    }
    if (!motion) {
      ctx.drawImage(image, meta.ax, meta.ay, meta.size, meta.size);
      return;
    }
    const poses = prepare(image, motion);
    const phase = motion === 'fly' ? now * 1.8 + unit.ph / cycle : motion === 'strike' ? attack : unit.stride;
    const frame = Math.floor(phase * frameCount) % frameCount;
    const size = meta.size / .88;
    const pad = size * .06;
    ctx.drawImage(poses.atlas, frame * poses.size, 0, poses.size, poses.size,
      meta.ax - pad, meta.ay - pad, size, size);
  }

  function drawSlash(ctx, unit, progress, color) {
    if (progress < .30 || progress > .76) return;
    const fade = 1 - Math.abs(progress - .5) * 3.6;
    ctx.save();
    ctx.translate(unit.x, unit.y - 6);
    ctx.rotate(unit.ang);
    ctx.globalAlpha = fade * .86;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(8, 0, 28, 16, 0, -1.05, .9);
    ctx.stroke();
    ctx.restore();
  }

  function drawRuins(ctx, x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#181922';
    ctx.beginPath();
    ctx.ellipse(0, 3, 23, 11, 0, 0, cycle);
    ctx.fill();
    ctx.strokeStyle = '#596675';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#303644';
    ctx.beginPath();
    polygon(ctx, [[-21, 2], [-11, -7], [3, -5], [0, 4], [-10, 8]]);
    polygon(ctx, [[2, 2], [11, -7], [21, 1], [15, 8], [7, 9]]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = .65;
    ctx.beginPath();
    polygon(ctx, [[-5, 2], [-2, -7], [3, -3], [1, 3]]);
    ctx.fill();
    ctx.restore();
  }

  window.ArenaVisuals = { prepare, drawUnit, drawSlash, drawRuins };
})();
