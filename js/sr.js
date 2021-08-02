// PMSM/HD 2020/08
// the original code has been changed by me to implement a simpler/lighter version
// and using Stamm-Reis algorithm

/*
Copyright (c) 2011 Juan Mellado

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWSRE IS PROVIDED "AS IS", WITHOUT WSRRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WSRRANTIES OF MERCHANTABILITY,
FITNESS FOR A PSRTICULSR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, SRISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWSRE OR THE USE OR OTHER DEALINGS IN
THE SOFTWSRE.
*/

/*
References:
- "ArUco: a minimal library for Augmented Reality applications based on OpenCv"
  http://www.uco.es/investiga/grupos/ava/node/26
*/

const borderBlackStartsAt = 4096;

var SR = SR || {};

SR.Marker = function(id, corners, angle, borderWhite){
  this.id = id;
  this.corners = corners;
  this.angle = angle;
  this.borderWhite = borderWhite;
};

SR.Detector = function(){
  this.grey = new CV.Image();
  this.thres = new CV.Image();
  this.homography = new CV.Image();
  this.binary = [];
  this.contours = [];
  this.polys = [];
  this.candidates = [];
};

SR.Detector.prototype.detect = function(image, markerMaxReturned, markerMinSideSize, maxAllowedPercentDiffBetweenSides, epsilon, warpSize){
  CV.grayscale(image, this.grey);
  CV.adaptiveThreshold(this.grey, this.thres, 2, 7);
  
  this.contours = CV.findContours(this.thres, this.binary);

  //this.candidates = this.findCandidates(this.contours, image.width * 0.20, 0.05, 10);
  this.candidates = this.findCandidates(this.contours, image.width * 0.20, epsilon, markerMinSideSize, maxAllowedPercentDiffBetweenSides);
  //if (this.candidates.length > 0) alert("After findCandidates\n" + JSON.stringify(this.candidates));
  this.candidates = this.clockwiseCorners(this.candidates);
  //if (this.candidates.length > 0) alert("After clockwiseCorners\n" + JSON.stringify(this.candidates));
  this.candidates = this.notTooNear(this.candidates, 10);
  //if (this.candidates.length > 0) alert("After notTooNear\n" + JSON.stringify(this.candidates));

  //return this.findMarkers(this.grey, this.candidates, 49, markerMaxReturned);
  return this.findMarkers(this.grey, this.candidates, warpSize, markerMaxReturned);
};


SR.Detector.prototype.findCandidates = function(contours, minSize, epsilon, minLength, maxAllowedPercentDiffBetweenSides){
  var candidates = [], len = contours.length, contour, poly, i;

  this.polys = [];
  
  for (i = 0; i < len; ++ i){
    contour = contours[i];

    if (contour.length >= minSize){
      poly = CV.approxPolyDP(contour, contour.length * epsilon);

      this.polys.push(poly);

      if ( (4 === poly.length) && ( CV.isContourConvex(poly) ) ){

        if ( CV.minEdgeLength(poly) >= minLength){
          if (CV.edgeLengthDiferencePercentage(poly) <= maxAllowedPercentDiffBetweenSides)
          candidates.push(poly);
        }
      }
    }
  }

  //if (candidates.length > 0) alert(JSON.stringify(candidates));
  // [[{"x":220,"y":122},{"x":124,"y":140},{"x":146,"y":237},{"x":240,"y":222}],[{"x":218,"y":124},{"x":237,"y":220},{"x":148,"y":235},{"x":126,"y":142}]]


  return candidates;
  
};

SR.Detector.prototype.clockwiseCorners = function(candidates){
  var len = candidates.length, dx1, dx2, dy1, dy2, swap, i;

  for (i = 0; i < len; ++ i){
    dx1 = candidates[i][1].x - candidates[i][0].x;
    dy1 = candidates[i][1].y - candidates[i][0].y;
    dx2 = candidates[i][2].x - candidates[i][0].x;
    dy2 = candidates[i][2].y - candidates[i][0].y;

    if ( (dx1 * dy2 - dy1 * dx2) < 0){
      swap = candidates[i][1];
      candidates[i][1] = candidates[i][3];
      candidates[i][3] = swap;
    }
  }

  return candidates;
};

SR.Detector.prototype.notTooNear = function(candidates, minDist){
  var notTooNear = [], len = candidates.length, dist, dx, dy, i, j, k;

  for (i = 0; i < len; ++ i){
  
    for (j = i + 1; j < len; ++ j){
      dist = 0;
      
      for (k = 0; k < 4; ++ k){
        dx = candidates[i][k].x - candidates[j][k].x;
        dy = candidates[i][k].y - candidates[j][k].y;
      
        dist += dx * dx + dy * dy;
      }
      
      if ( (dist / 4) < (minDist * minDist) ){
      
        if ( CV.perimeter( candidates[i] ) < CV.perimeter( candidates[j] ) ){
          candidates[i].tooNear = true;
        }else{
          candidates[j].tooNear = true;
        }
      }
    }
  }

  for (i = 0; i < len; ++ i){
    if ( !candidates[i].tooNear ){
      notTooNear.push( candidates[i] );
    }
  }

  return notTooNear;
};

SR.Detector.prototype.findMarkers = function(imageSrc, candidates, warpSize, markerMaxReturned){
  var markers = [], len = candidates.length, candidate, marker, i;

  for (i = 0; i < len; ++ i){
    candidate = candidates[i];

    CV.warp(imageSrc, this.homography, candidate, warpSize);
  
    CV.threshold(this.homography, this.homography, CV.otsu(this.homography) );

    marker = this.getMarker(this.homography, candidate);
    if (marker){
      markers.push(marker);
      if (markerMaxReturned > 0 && markers.length >= markerMaxReturned) {
        return markers;
      }
    }
  }
  
  return markers;
};



SR.Detector.prototype.getMarker = function(imageSrc, candidate){
  var width = (imageSrc.width / 7) >>> 0,
      minZero = (width * width) >> 1,
      bits = [], rotations = [], distances = [],
      square, pair, inc, i, j;

  var borderWhite = false;

  for (i = 0; i < 7; ++ i){
    inc = (0 === i || 6 === i)? 1: 6;
    
    for (j = 0; j < 7; j += inc){
      square = {x: j * width, y: i * width, width: width, height: width};

      if ( CV.countNonZero(imageSrc, square) > minZero){
        if ( CV.countNonOne(imageSrc, square) > minZero) {
          return null;
        }
        else {
          borderWhite = true;
        }
      }
    }
  }

  for (i = 0; i < 5; ++ i){
    bits[i] = [];

    for (j = 0; j < 5; ++ j){
      square = {x: (j + 1) * width, y: (i + 1) * width, width: width, height: width};
      
      if (borderWhite) bits[i][j] = CV.countNonZero(imageSrc, square) > minZero? 0: 1;
      else bits[i][j] = CV.countNonZero(imageSrc, square) > minZero? 1: 0;
      
    }
  }

  rotations[0] = bits;
  distances[0] = this.hammingDistance( rotations[0] );
  
   pair = {first: distances[0], second: 0};
  
  var orientationOk = isRotationCorrect(rotations[0]);

  if (orientationOk) {
    distances[0] = 0;
    pair.second = 0;
  }
  else {
    for (i = 1; i < 4; ++ i){
      rotations[i] = this.rotate( rotations[i - 1] );
      distances[i] = this.hammingDistance( rotations[i] );
      
      /*if (distances[i] < pair.first){
        pair.first = distances[i];
        pair.second = i;
      }*/
  
      orientationOk = isRotationCorrect(rotations[i]);
      if (orientationOk) {
        distances[i] = 0;
        pair.second = i;
        break;
      }
 
    }
  }

  if (!orientationOk) {
    return null;
  }

  var arrayAsString = "";
  for (let i = 0; i < bits.length; i++) {
    for (let j = 0; j < bits.length; j++) {
     var bit = "" + rotations[pair.second][i][j];
     arrayAsString = arrayAsString + bit;
     //arrayAsString = bit + arrayAsString;
    }
  }

  var srResult = stammReis().decodeImage(arrayAsString);
  
  if (!srResult.success) {
    return null;
  }

  var corners = this.rotate2(candidate, 4 - pair.second);
  var markerAngle = angle(corners[0].x, corners[0].y, corners[1].x, corners[1].y);

  if (!borderWhite) srResult.markerCode += borderBlackStartsAt;

  return new SR.Marker(
    srResult.markerCode, 
    corners,
    markerAngle,
    borderWhite
    );
  
  /*return new SR.Marker(
      this.mat2id( rotations[pair.second] ), 
      this.rotate2(candidate, 4 - pair.second) );*/

};


function angle(cx, cy, ex, ey) {
  var dy = ey - cy;
  var dx = ex - cx;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  //if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
}

function isRotationCorrect(markerArray) {
  return markerArray[0][0] == 0 && markerArray[0][4] == 1 && markerArray[4][0] == 1 && markerArray[4][4] == 1
}


SR.Detector.prototype.hammingDistance = function(bits){
  var ids = [ [1,0,0,0,0], [1,0,1,1,1], [0,1,0,0,1], [0,1,1,1,0] ],
      dist = 0, sum, minSum, i, j, k;

  for (i = 0; i < 5; ++ i){
    minSum = Infinity;
    
    for (j = 0; j < 4; ++ j){
      sum = 0;

      for (k = 0; k < 5; ++ k){
          sum += bits[i][k] === ids[j][k]? 0: 1;
      }

      if (sum < minSum){
        minSum = sum;
      }
    }

    dist += minSum;
  }

  return dist;
};

SR.Detector.prototype.mat2id = function(bits){
  var id = 0, i;
  
  for (i = 0; i < 5; ++ i){
    id <<= 1;
    id |= bits[i][1];
    id <<= 1;
    id |= bits[i][3];
  }

  return id;
};

SR.Detector.prototype.rotate = function(src){
  var dst = [], len = src.length, i, j;
  
  for (i = 0; i < len; ++ i){
    dst[i] = [];
    for (j = 0; j < src[i].length; ++ j){
      dst[i][j] = src[src[i].length - j - 1][i];
    }
  }

  return dst;
};

SR.Detector.prototype.rotate2 = function(src, rotation){
  var dst = [], len = src.length, i;
  
  for (i = 0; i < len; ++ i){
    dst[i] = src[ (rotation + i) % len ];
  }

  return dst;
};
