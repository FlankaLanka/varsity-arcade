// Point interface
export interface Point {
  x: number;
  y: number;
}

// Check if a circle intersects with a line segment
export function circleIntersectsSegment(
  circleCenter: Point,
  circleRadius: number,
  segmentStart: Point,
  segmentEnd: Point
): boolean {
  // Vector from start to end
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  
  // If segment length is 0, check distance to point
  if (dx === 0 && dy === 0) {
    const dist = Math.sqrt(
      Math.pow(circleCenter.x - segmentStart.x, 2) + 
      Math.pow(circleCenter.y - segmentStart.y, 2)
    );
    return dist <= circleRadius;
  }

  // Project circle center onto the line segment (parameter t)
  // t = ((cx-x1)(x2-x1) + (cy-y1)(y2-y1)) / |p2-p1|^2
  const t = ((circleCenter.x - segmentStart.x) * dx + (circleCenter.y - segmentStart.y) * dy) / (dx * dx + dy * dy);

  // Find the closest point on the segment
  let closestX, closestY;
  
  if (t < 0) {
    closestX = segmentStart.x;
    closestY = segmentStart.y;
  } else if (t > 1) {
    closestX = segmentEnd.x;
    closestY = segmentEnd.y;
  } else {
    closestX = segmentStart.x + t * dx;
    closestY = segmentStart.y + t * dy;
  }

  // Check distance from closest point to circle center
  const distSq = Math.pow(circleCenter.x - closestX, 2) + Math.pow(circleCenter.y - closestY, 2);
  
  return distSq <= circleRadius * circleRadius;
}

// Calculate center of mass for a path
export function getPathCenter(path: Point[]): Point {
  if (path.length === 0) return { x: 0, y: 0 };
  
  let sumX = 0;
  let sumY = 0;
  
  path.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  
  return {
    x: sumX / path.length,
    y: sumY / path.length
  };
}

