// PMSM/HD 2020-08
// Stamm-Reis algorithm (adapted and corrected by me to be used on my test example)
// 0 represents the white color (0: white, 1 black)

var stammReis = function () {

    // private 

    const rotateLeft = [0, 21, 16, 11, 6, 1, 22, 17, 12, 7, 2, 23, 18, 13, 8, 3, 24, 19, 14, 9, 4, 25, 20, 15, 10, 5];
    const bitToColRow = [0, 13, 17, 9, 20, 24, 6, 2, 14, 18, 7, 10, 22, 11, 3, 12, 19, 8, 15, 23, 16, 4];
    const colRowToABCn = [7, 14, 21, 6, 10, 17, 3, 11, 13, 15, 1, 8, 18, 20, 2, 9, 16, 4, 12, 19, 5];

    const maxMiddle = 1 << 12;

    const borderBlackStartsAt = 4096;

    function decodeImage(tableBW) //returns object decodeImageResult
    {
        decodeImageResult = {};
        decodeImageResult.markerCode = null;
        decodeImageResult.markerWhiteBorder = null;
        decodeImageResult.markerRotation = 0;
        decodeImageResult.success = false;
        decodeImageResult.parityOk = false;
        decodeImageResult.positionOk = false;
        decodeImageResult.message = null;

        if (tableBW == null || tableBW.length != 25) {
            decodeImageResult.message = "ERROR: input must be 25 in length!";
            return decodeImageResult;
        }


        if (tableBW.charAt(0) == '0' || tableBW.charAt(0) == '1') {
            var tableBWnew = "";
            for (let i = 0; i < 25; i++)
                tableBWnew += tableBW.charAt(i) == '0' ? 'w' : 'b';
            tableBW = tableBWnew;
        }

        var cornerBackOrWhite = placeCornerTopUp(tableBW);
        if (cornerBackOrWhite == null) {
            decodeImageResult.message = "ERROR: no unique corner color found!";
            return decodeImageResult;
        }
        else {
            decodeImageResult.positionOk = true;
            tableBW = cornerBackOrWhite.substring(2);
            var topLeftCornerIsBlack = tableBW.charAt(0) == 'b';
            decodeImageResult.markerWhiteBorder = !topLeftCornerIsBlack;
            var iCorner = cornerBackOrWhite.charAt(0) - '0';
            if (iCorner > 0) {
                decodeImageResult.markerRotation = (90 * iCorner);
            }
            //no need to remove corners

            var bitsOrdered = "";
            for (let i = 1; i <= 21; i++)
                if (bitToColRow[i] % 2 == 0) //
                    bitsOrdered = (tableBW.charAt(bitToColRow[i] - 1) == 'b' ? 1 : 0) + bitsOrdered;
                else
                    bitsOrdered = (tableBW.charAt(bitToColRow[i] - 1) == 'b' ? 0 : 1) + bitsOrdered;

            var decodedBits = decodeBitsOrdered(bitsOrdered, topLeftCornerIsBlack);

            decodeImageResult.markerCode = decodedBits.code;

            if (decodedBits.posFailed[0] + decodedBits.posFailed[1] + decodedBits.posFailed[2] == 0) {
                decodeImageResult.parityOk = true;
            }
            else {
                decodeImageResult.message = "ERROR: Parity error!";
                return decodeImageResult;
            }
        }

        decodeImageResult.success = decodeImageResult.parityOk && decodeImageResult.positionOk && (decodeImageResult.markerCode != null);

        //{"markerCode":4095,"markerWhiteBorder":true,"markerRotation":0,"success":true,"parityOk":true,"positionOk":true,"message":"Ok."}
        if (decodeImageResult.success) {
            decodeImageResult.message = "Ok.";
            if (!decodeImageResult.markerWhiteBorder) decodeImageResult.markerCode += borderBlackStartsAt;
        }
        
        return decodeImageResult;
    };



    function placeCornerTopUp(bwbwbw) {

        for (let i = 0; i < 4; i++)
            if (bwbwbw.charAt(0) != bwbwbw.charAt(4)
                && bwbwbw.charAt(4) == bwbwbw.charAt(20)
                && bwbwbw.charAt(4) == bwbwbw.charAt(24))
                return i + " " + bwbwbw;
            else {
                var rotate = new char[26];
                var bwbwbwLength = bwbwbw.length;
                for (let num = 1; num <= bwbwbwLength; num++)
                    rotate[rotateLeft[num]] = bwbwbw.charAt(num - 1);
                bwbwbw = "";
                for (let num = 1; num <= bwbwbwLength; num++)
                    bwbwbw += rotate[num];
            }

        return null;

    }



    function checkParity(codeBinary, nextParityBit) {
        var bitPos = 1;
        while (nextParityBit > 1) {
            nextParityBit /= 2;
            bitPos++;
        }
        var par = 0;
        for (let b = 1; b <= codeBinary.length; b++) {
            //var binary = Integer.toBinaryString(b);
            var binary = (b).toString(2)
            if (bitPos <= binary.length && binary.charAt(binary.length - bitPos) == '1')
                if (b <= codeBinary.length && codeBinary.charAt(codeBinary.length - b) == '1')
                    par = 1 - par;
        }
        return par;
    }



    function decodeBitsOrdered(totalBitsOrdered, topLeftCornerIsBlack) {
        //remove parity bits
        var result = {};
        numberAsBinary = "";
        result_parityBits = ["", "", ""];
        result.posFailed = [0, 0, 0];
        result.failedPosition = ["", "", ""];

        for (let letter = 0; letter < 3; letter++) {
            var bitsOrdered = totalBitsOrdered.substring(21 - (letter + 1) * 7, 21 - letter * 7);

            var nextParityBit = 1;
            for (let i = 1; i <= 7; i++)
                if (i == nextParityBit) {
                    result_parityBits[letter] = bitsOrdered.charAt(bitsOrdered.length - i) + result_parityBits[letter];
                    nextParityBit *= 2;
                }
                else
                    numberAsBinary = bitsOrdered.charAt(bitsOrdered.length - i) + numberAsBinary;

            result.code = parseInt(numberAsBinary, 2);

            if (topLeftCornerIsBlack) result.code = maxMiddle - result.code - 1;

            nextParityBit = 1;
            var parityFailed = false;
            result.failedPosition = ["", "", ""];
            for (let i = 0; i < 5; i++) {
                result.failedPosition[letter] = checkParity(bitsOrdered, nextParityBit) + result.failedPosition[letter];
                nextParityBit *= 2;
            }

        }//for letter

        return result;
    }



    function srDecodeImageExample() {

        show("0010111000010100111111001"); // marker number 613 white border (without border bits)
        //show("wwbwbbbwwwwbwbwwbbbbbbwwb");
        show("1101000111101011000000110"); // marker number 613 black border (without border bits)
        //show("bbwbwwwbbbbwbwbbwwwwwwbbw");

        function show(markerBitsWithoutBorder) {
            alert("Marker number bits (without border bits):\n" + markerBitsWithoutBorder +
                "\n\nDecode result:\n" + JSON.stringify(decodeImage(markerBitsWithoutBorder)));
        }
    }





    function markerCreationAndDecodingFullTest(markerNumber) {

        // generate marker data for the given marker number and border color
        var markerData = markerGenerateBlackAndWhiteArrayForNumber(markerNumber);

        // get string of bits to decode (from the generated marker array)
        var stringOfBitsToDecode = "";
        var decodeMessage = "";
        if (markerData.success) {
            for (let row = 1; row < 6; row++) {
                for (let col = 1; col < 6; col++) {
                    stringOfBitsToDecode += markerData.markerArray[row][col];
                }
            }
            decodeMessage = "\n\nMARKER ARRAY DECODE TEST:\nBits to decode (marker without border): " + stringOfBitsToDecode
                + "\nDecode result:\n" + JSON.stringify(decodeImage(stringOfBitsToDecode))
        }
        alert("MARKER ARRAY CREATION\n" + JSON.stringify(markerData) + decodeMessage);
    }



    function markerGenerateBlackAndWhiteArrayForNumber(markerNumber) {

        var whiteBorder = markerNumber < borderBlackStartsAt;
        var result = { success: false, markerNumber: markerNumber, whiteBorder: whiteBorder, markerArray: [], message: null };

        if (isNaN(markerNumber) || markerNumber < 0 || markerNumber >= (borderBlackStartsAt * 2)) {
            result.message = "Invalid marker number (must be an integer from 0 to " + (borderBlackStartsAt * 2 - 1) + ")";
            return result;
        }

        markerNumber = +markerNumber; // string to number conversion

        if (markerNumber >= borderBlackStartsAt) markerNumber -= borderBlackStartsAt; 

        var borderBit = whiteBorder ? "0" : "1";
        var borderRow = [borderBit, borderBit, borderBit, borderBit, borderBit, borderBit, borderBit];

        var numberAsBinary = markerNumber.toString(2);

        if (numberAsBinary.length < 12) numberAsBinary = "0".repeat(12 - numberAsBinary.length) + numberAsBinary;

        var result_stammReisCodeZeros = ""
        var result_stammReisCode = ""
        var result_parityBits = ""

        for (let letter = 0; letter < 3; letter++) {
            let codeBinary = numberAsBinary.slice(12 - (letter + 1) * 4, 12 - letter * 4)

            let letterStammReisCodeZeros = ""

            let numBit = 1
            let nextParityBit = 1
            for (let i = 1; i <= 7; i++)

                if (i == nextParityBit) {
                    letterStammReisCodeZeros = "0" + letterStammReisCodeZeros
                    nextParityBit *= 2
                }
                else {
                    letterStammReisCodeZeros = codeBinary.charAt(4 - numBit) + letterStammReisCodeZeros
                    numBit++
                }

            result_stammReisCodeZeros = letterStammReisCodeZeros + result_stammReisCodeZeros;

            nextParityBit = 1
            numBit = 1
            for (let i = 1; i <= 7; i++)
                if (i == nextParityBit) {
                    let par = parity(letterStammReisCodeZeros, nextParityBit);
                    result_stammReisCode = par + result_stammReisCode
                    result_parityBits = par + result_parityBits
                    nextParityBit *= 2
                }
                else {
                    let bit = codeBinary.charAt(4 - numBit)
                    result_stammReisCode = bit + result_stammReisCode
                    numBit++
                }

        }//for letter

        let num = 0;
        numBit = 1;
        let rcNum = 5;

        result.markerArray.push(borderRow);

        for (let row = 1; row <= rcNum; row++) {
            var columnBitArray = [borderBit];
            for (let col = 1; col <= rcNum; col++) {
                num++
                let charOfBit = ""
                //let numBitRepresented = ""
                let blackNotWhite = false;
                if ((col == 1 || col == rcNum) && (row == 1 || row == rcNum)) {
                    if (col == 1 && row == 1)
                        blackNotWhite = false;
                    else
                        blackNotWhite = true;
                }
                else {
                    blackNotWhite = num % 2 == 1;

                    charOfBit = result_stammReisCode.charAt(result_stammReisCode.length - colRowToABCn[numBit - 1]);

                    if (charOfBit == '1')
                        blackNotWhite = !blackNotWhite
                    numBit++
                }

                if (whiteBorder) {
                    columnBitArray.push(blackNotWhite ? "1" : "0");
                }
                else {
                    columnBitArray.push(blackNotWhite ? "0" : "1");
                }
            }//col
            columnBitArray.push(borderBit);
            result.markerArray.push(columnBitArray);

        }//row

        result.markerArray.push(borderRow);

        result.success = true;
        result.message = "0: white, 1 black";

        return result
    }



    function parity(codeBinary, nextParityBit) {
        let bitPos = 1
        while (nextParityBit > 1) {
            nextParityBit /= 2
            bitPos++
        }
        let par = 0
        for (let b = 1; b <= codeBinary.length; b++) {
            let binary = (b).toString(2)
            if (bitPos <= binary.length && binary.charAt(binary.length - bitPos) == '1')
                if (b <= codeBinary.length && codeBinary.charAt(codeBinary.length - b) == '1')
                    par = 1 - par
        }
        return par
    }


    // public
    return {

        decodeImage: function (tableBW) {
            return decodeImage(tableBW);
        },

        markerGenerateBlackAndWhiteArrayForNumber: function (markerNumber) {
            return markerGenerateBlackAndWhiteArrayForNumber(markerNumber);
        },

        markerCreationAndDecodingFullTest: function (markerNumber) {
            return markerCreationAndDecodingFullTest(markerNumber);
        },

        srDecodeImageExample: function () {
            return srDecodeImageExample();
        }

    }

};