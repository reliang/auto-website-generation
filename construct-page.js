window.onload = () => {
    var doc = document.implementation.createHTMLDocument();
    doc.body.append('Hello World!');
    var iframeDoc = document.querySelector('iframe').contentDocument;
    iframeDoc.replaceChild(
        doc.documentElement,
        iframeDoc.documentElement
    );
}

var files;
var input;

function generateWebsite() {

    // example input json
    var input = {
        "images": [
            {
                "src": "test-content/japan-750x536.jpg",
                "width": 750,
                "height": 536
            },
            {
                "src": "test-content/london-1920x1080.jpg",
                "width": 1920,
                "height": 1080
            },
            {
                "src": "test-content/paris-1920x1279.jpg",
                "width": 1920,
                "height": 1279
            }
        ]
    }

    input = {
        "images": []
    }

    // read files and into json
    if (!files) {
        document.getElementById("upload-message").innerHTML = "No folder uploaded";
    } else {
        for (let i = 0; i < files.length; i++) {
            // Check if the file is an image.
            let file = files[i];
            let item = {};
            item["src"] = file.webkitRelativePath;
            item["url"] = URL.createObjectURL(file);
            /*
            if (file.type && file.type.match('image.*')) {
                var reader = new FileReader();
                reader.addEventListener('load', (event) => {
                    item["src"] = event.target.result;
                });
                reader.readAsDataURL(file);

                //item["width"] = 
                input.images.push(item);
            }
            */
           if (file.type && file.type.match('image.*')) {
               input.images.push(item);
           }
           
        }
    }
    
    console.log(input);

    // generate website from JSON object
    var doc = document.implementation.createHTMLDocument();
    
    for (x in input.images) {
        let img = new Image();
        img.src = input.images[x].url;
        console.log(input.images[x]);
        console.log(input.images[x].url);
        img.height = 250;
        doc.body.append(img);
    }
    var iframeDoc = document.querySelector('iframe').contentDocument;
    iframeDoc.replaceChild(
        doc.documentElement,
        iframeDoc.documentElement
    );
}

document.getElementById("filepicker").addEventListener("change", function (event) {
    files = event.target.files;
    document.getElementById("upload-message").innerHTML = "Folder uploaded!";
});

function img_create(src, alt, title) {
    var img = new Image();
    img.src = src;
    if (alt != null) img.alt = alt;
    if (title != null) img.title = title;
    return img;
}
