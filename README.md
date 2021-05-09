# Automatic Optimization of Website Layout

## Abstract

While furniture layout algorithms have been explored in the Computer Graphics field, not many optimization algorithms exist for web layouts. I hope to create a software that would consider web design and usability prin-ciples to generate usable website layouts. The algorithm would be based off of furniture arrangement algo-rithms. It would use a combination of optimization-based technique and procedural generation.

**Note:** This web generation tool is best compatible with Chrome. The websites generated are adapted to the pc screen. They do not adapt to scale for mobile, tablet, or other formats.

## Demo

**Demo Link:** [https://reliang.github.io/auto-website-generation/](https://reliang.github.io/auto-website-generation/)

#### Step 1: Upload content folder

Upload a file directory, max 10MB. You can start with the [demo content](./demo-content).

For a simple landing page, one can include in the file directory:

*   h1.txt - a title text, in a txt file named "h1"
*   h3.txt - a subtitle text, in a txt file named "h3"
*   p.txt - a paragraph text, in a txt file named "p"
*   button.txt - a call-to-action button text, in a txt file named "button"
*   image (png/jpg) - an image, in a png/jpg file with any name
*   background image (png/jpg) - an image, in a png/jpg file named "background"
*   logo (png/jpg) - an image, in a png/jpg file named "logo"

For multiple page sections, one can include in the file directory:

*   subfolders representing content within each section, named by section order, beginning with 0 (e.g. 0/, 1/, 2/ etc.)

For folder 0, the landing page section, one can include in the file directory:

*   Any items outlined above for simple landing page

For folders 1 and above, or sections following the landing, one can include in the file directory:

*   h1.txt - a title text, in a txt file named "h1"
*   h3.txt - a subtitle text, in a txt file named "h3"
*   p.txt - a paragraph text, in a txt file named "p"
*   button.txt - a call-to-action button text, in a txt file named "button"
*   image (png/jpg) - an image, in a png/jpg file with any name
*   gallery images (png/jpg) - a series of images, in png/jpg file named "gallery1", "gallery2" etc. The gallery arranges images in 4 columns.

#### Step 2: Customize page settings

#### Step 3: Generate website

Regereate to see different website layout optimization results.

#### Step 4: Download HTML

Once you are happy with the results, you can generate and download the HTML file. Then place the downloaded HTML file in the same parent directory as the uploaded folder. Then you're done! Open the file in a browser to view it.
