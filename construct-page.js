window.onload = () => {
    var doc = document.implementation.createHTMLDocument();
    doc.body.append('Hello World!');
    var iframeDoc = document.querySelector('iframe').contentDocument;
    iframeDoc.replaceChild(
        doc.documentElement,
        iframeDoc.documentElement
    );
}

/**
 * TODO
 * Make const for max rol num and col num
 * Make const for each probability
 * Write code to test convergence
 */

const IMG = 0;
const P = 1;
const H1 = 2;

const h1 = /^# (.*$)/gim; // captures title
const p = /^(?!(!\[.*?\]\(.*?\))|[#\n])(.*$)/gm;// no lines starting with ![Any text](Any text), # any text, or \n
const image = /!\[.*?\]\((.*?)\)/gim; // captures url

var files;
var input;
var numRows;

function generateWebsite() {
    // init json
    input = [];

    // have to wait for everything to load
    let fileCount = 0;
    let validFiles = [];
    var filesLoaded = 0;

    // READ INPUT
    // read files into json
    if (!files) {
        document.getElementById("upload-message").innerHTML = "No folder uploaded";
        return;
    } else {
        // check files valid
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if (file.type && (file.type.match('image.*') || file.type.match('text/plain'))) {
                fileCount++;
                validFiles[i] = true;
            }
            // test
            /*
            if (getFileName(file.webkitRelativePath) === "content.txt") {
            }
            */
        }
        
        for (let i = 0; i < files.length; i++) {
            if (!validFiles[i]) {
                //console.log("file ", i, " is invalid");
                continue;
            }
            let file = files[i];
            let item = {};
            item["src"] = file.webkitRelativePath;
            item["url"] = URL.createObjectURL(file);
            
            // Check if the file is an image.
            if (file.type && file.type.match('image.*')) {
                item["type"] = IMG;
                let img = new Image();
                img.onload = function () {
                    item["width"] = this.width;
                    item["height"] = this.height;
                    // width / height, >1 means width > height
                    item["ratio"] = this.width / this.height;
                    filesLoaded++;
                    if (fileCount == filesLoaded) {
                        allLoaded();
                    }
                };
                img.src = item["url"];
            } else if (file.type && file.type.match('text.*')) {
                if (getFileName(item["src"]) === "h1.txt") {
                    item["type"] = H1;
                } else {
                    item["type"] = P;
                }
                var fr = new FileReader();
                //item["content"] = "hi";
                fr.onload = (function(fr, item) {
                    return function() {
                        //console.log(fr.result);
                        item["content"] = fr.result;
                        filesLoaded++;
                        if (fileCount == filesLoaded) {
                            allLoaded();
                        }
                    }
                })(fr, item);
                fr.readAsText(file);
            }
            input.push(item);
        }
    }
}

// must wait for all files to be loaded before optimizing
function allLoaded(){
    // OPTIMIZE
    var output = optimize(input);

    // DISPLAY
    // generate website from JSON object
    var doc = document.implementation.createHTMLDocument();
    // add bootstrap to head
    var headID = doc.getElementsByTagName('head')[0];
    var link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta2/dist/css/bootstrap.min.css";
    link.integrity = "sha384-BmbxuPwQa2lc/FVzBcNJ7UAyJxM6wuqIj61tLrc4wSX0szH/Ev+nYRRuWlolflfl";
    link.crossOrigin = "anonymous";
    headID.appendChild(link);
    // create document grid
    var grid = doc.createElement('div');
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(12, 8.33%)";
    grid.style.gridTemplateRows = "repeat(" + numRows + ", auto)";
    doc.body.append(grid);
    // add images to grid
    for (x in output) {
        let item = output[x];
        let row = item.style.row;
        let col = item.style.col;
        let colSize = item.style["col-size"];
        let docItem;
        if (item.type == IMG) {
            docItem = new Image();
            docItem.src = item.url;
            docItem.style.width = "100%";
            docItem.style.gridRow = "" + (row + 1) + " / span " + 1;
            docItem.style.gridColumn = "" + (col + 1) + " / span " + colSize;
        } else if (item.type == P) {
            docItem = doc.createElement('p');
            docItem.innerHTML = item.content;
            docItem.className = "px-4 pb-4";
            docItem.style.gridRow = "" + (row + 1) + " / span " + 1;
            docItem.style.gridColumn = "" + (col + 1) + " / span " + colSize;
        } else if (item.type == H1) {
            docItem = doc.createElement('h1');
            docItem.innerHTML = item.content;
            docItem.className = "px-4 pb-4";
            docItem.style.gridRow = "" + (row + 1) + " / span " + 1;
            docItem.style.gridColumn = "" + (col + 1) + " / span " + colSize;
        }
        grid.append(docItem);
    }
    var iframeDoc = document.querySelector('iframe').contentDocument;
    iframeDoc.replaceChild(
        doc.documentElement,
        iframeDoc.documentElement
    );
}

document.getElementById("filepicker").addEventListener("change", function (event) {
    // input has to be <10 mb
    if (event.target.files[0].size > 10485760) {
        document.getElementById("upload-message").innerHTML = "File size too big (max 10mb)";
    } else {
        files = event.target.files;
        document.getElementById("upload-message").innerHTML = "Folder uploaded!";
    }

});

function getFileName(fullPath) {
    var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
    var filename = fullPath.substring(startIndex);
    if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
        filename = filename.substring(1);
    }
    return filename;
}

function optimize(input) {
    // set up image width to 100%, since we are using grids
    // place images into grid
    var row = 0;
    var col = 0;
    //var rowCapacity = 12;
    //var rowCapacities = [];
    for (x in input) {
        let item = input[x];
        // TODO randomize col size, row & col
        var colSize = 6;
        /*
        if (rowCapacity - colSize >= 0) {
            col = 12 - rowCapacity;
            rowCapacity -= colSize;
        } else {
            rowCapacities.push(rowCapacity);
            row++;
            col = 0;
            rowCapacity = 12 - colSize;
        }
        */
        item["style"] = {
            "row": 1,
            "col": 1,
            "col-size": colSize
        }
    }
    //rowCapacities.push(rowCapacity);
    
    //console.log(rowCapacities);
    //console.log(input);
    return optimizeIter(input, 0.3/*, rowCapacities*/);
}

function optimizeIter(input, threshold/*, rowCapacities*/) {

    /**
     * Rules
     * each row must have content
     * rows have mb
     * 
     * optimization moves
     * 1. set image to random grid size between 3 to 9 (probability 0.3)
     * 2. change image row, with possibility to add row (probability 0.3)
     * 3. add div as spacer to change col of image (probability 0.3)
     * 
     * Post processing
     * Remove empty rows
     */

    var iter = 0;
    var lastInput = JSON.parse(JSON.stringify(input));
    var cost = testCost(lastInput);
    var currRowMax = 1;

    while (cost > threshold) {
        let nextInput = JSON.parse(JSON.stringify(lastInput));
        // optimization moves
        for (x in nextInput) {
            let item = nextInput[x];
            let origRow = nextInput[x].style.row;
            let origCol = nextInput[x].style.col;
            let origColSize = nextInput[x].style["col-size"];
            let row = origRow;
            let col = origCol;
            let colSize = origColSize;
            let moveImage = false;
            // set image to random grid size
            if (Math.random() < 0.3) {
                colSize = 3 + Math.floor(Math.random() * 7);
                if (col + colSize > 12) {
                    col = 12 - colSize;
                }
            }
            // set image row
            if (Math.random() < 0.3) {
                // try to add image into an existing row
                if (Math.random() < 0.8) {
                    row = Math.floor(Math.random() * currRowMax);
                } else {
                    row = currRowMax;
                    currRowMax++;
                }
            }
            // set image col
            if (Math.random() < 0.3) {
                col = Math.floor(Math.random() * (12 - colSize));
            }
            item["style"] = {
                "row": row,
                "col": col,
                "col-size": colSize
            }
        }
        let rowContent = [];
        // another pass to order elements, then another to set image column, reduce image rows
        for (x in nextInput) {
            let item = nextInput[x];
            let row = item.style.row;
            if (Array.isArray(rowContent[row])) {
                rowContent[row].push(item);
            } else {
                rowContent[row] = [item];
            }
        }
        let rowCount = 0;
        for (x in rowContent) {
            let currRow = rowContent[x];
            if (Array.isArray(currRow)) {
                for (y in currRow) {
                    let item = currRow[y];
                    item.style.row = rowCount;
                }               
                rowCount++;
            }
        }
        numRows = rowCount;

        // calculate new cost, replace if new < current
        let newCost = testCost(nextInput);
        if (newCost < cost) {
            lastInput = nextInput;
            cost = newCost;
        }
        //console.log(lastInput);
        //console.log(cost);
        iter++;
    }
    console.log(iter);
    console.log(lastInput);
    return lastInput;
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

// test cost function, largest distance = least cost
function testCost(input) {
    if (input.length < 2) {
        return 0;
    }
    let cost = 0;
    for (x = 0; x < input.length - 1; x++) {
        let y;
        for (y = x + 1; y < input.length; y++) {
            let rowX = input[x].style.row;
            let colX = input[x].style.col;
            let colSizeX = input[x].style["col-size"];
            let endColX = colX + colSizeX - 1;
            let rowY = input[y].style.row;
            let colY = input[y].style.col;
            let colSizeY = input[y].style["col-size"];
            let endColY = colY + colSizeY - 1;
            let vertDist = Math.abs(rowY - rowX);
            let horizDist;
            // no vertical overlap
            if (endColX < colY) {
                horizDist = colY - endColX;
            } else if (endColY < colX) {
                horizDist = colX - endColY;
            } else {
                // between 0 and 1 depending on amount of overlap
                let overlap = Math.min(endColX, endColY) - Math.max(colX, colY) + 1;
                // average the overlap fraction of the two
                horizDist = ((1 - overlap / colSizeX) + (1 - overlap / colSizeY)) / 2; //TODO
            }
            cost += 1 / (horizDist + vertDist);
        }
    }
    // average over number of pairs, (n*(n-1))/2
    cost *= 2 / (input.length * (input.length - 1));
    return cost;
}

function distributionCost(input) {
    if (input.length < 2) {
        return 0;
    }
    let dist = [];
    let cost = 0;
    let sum = 0;
    // compute mean dist
    for (x = 0; x < input.length - 1; x++) {
        let y;
        for (y = x + 1; y < input.length; y++) {
            let rowX = input[x].style.row;
            let colX = input[x].style.col;
            let colSizeX = input[x].style["col-size"];
            let endColX = colX + colSizeX - 1;
            let rowY = input[y].style.row;
            let colY = input[y].style.col;
            let colSizeY = input[y].style["col-size"];
            let endColY = colY + colSizeY - 1;
            let vertDist = Math.abs(rowY - rowX);
            let horizDist;
            // no vertical overlap
            if (endColX < colY) {
                horizDist = colY - endColX;
            } else if (endColY < colX) {
                horizDist = colX - endColY;
            } else {
                // between 0 and 1 depending on amount of overlap
                let overlap = Math.min(endColX, endColY) - Math.max(colX, colY) + 1;
                // average the overlap fraction of the two
                horizDist = ((1 - overlap / colSizeX) + (1 - overlap / colSizeY)) / 2; //TODO
            }
            let currDist = Math.sqrt(horizDist * horizDist + vertDist * vertDist);
            sum += currDist;
            dist.push(currDist);
        }
    }
    // compute variance
}