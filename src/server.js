const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { replaceBackground } = require('backrem');

const PORT = 8080;

const app = express();

const imagesPath = path.resolve(__dirname, 'images');

const getPathImage = (id) => `${imagesPath}/${id}`;

const getFileName = (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`);

const storage = multer.diskStorage({
  destination: (req, file, cd) => cd(null, imagesPath),
  filename: getFileName,
});

const upload = multer({ storage });

const wrapperError = (options, callback) => {
  try { callback(options) } catch (err) { const { res, next } = options; res.status(400); next(err) }
}

const uploadCallback = ({ req, res }) => {
  const { size, filename } = req.file;
  const [uploadedAt] = filename.split('.');
  res.status(200).json({ id: req.file.filename, uploadedAt, size });
}

app.post('/upload', upload.single('image'), (req, res, next) => wrapperError({ req, res, next }, uploadCallback))

const getInfoImages = (filename) => {
  let stats = fs.statSync(`${imagesPath}/${filename}`);
  let size = stats["size"];
  const [uploadedAt] = filename.split('.');
  return { size, uploadedAt, id: filename }
}

const getImageList = ({ req, res }) => fs.readdir(imagesPath, (err, data) => res.status(200).json(data.map(getInfoImages)));


const handleMerge = ({ req, res, next }) => {
  const { front, back, color = '250,0,0', threshold = 0 } = req.query;

  const colorToReplace = color.split(',').map((n) => parseInt(n, 10));

  const thresholdInt = parseInt(threshold, 10);

  fs.access(getPathImage(front), (err) => { if (err) res.status(404).json('Not Found'); })

  fs.access(getPathImage(back), (err) => { if (err) res.status(404).json('Not Found'); })

  const frontStream = fs.createReadStream(getPathImage(front));
  const backStream = fs.createReadStream(getPathImage(back));

  res.setHeader('Content-type', 'image/jpeg');

  replaceBackground(frontStream, backStream, colorToReplace , thresholdInt).then(
      (readableStream) => {
        readableStream.pipe(res);
      }
  );
}

const getImage = ({ req, res }) => fs.access(getPathImage(req.params.id), (err) => err ? res.status(404).json('Not Found') : getImageAnswerServer(res, req));

const errCallback = (err, options) => {
  const { res, req } = options;
  if (err && err.length) return res.status(404).json('Not Found')
  
  res.status(200)
  res.json({ id: req.params.id })
}

const deleteImage = ({ req, res }) => fs.unlink(getPathImage(req.params.id), (err) => errCallback(err, { res, req }));

const getImageAnswerServer = (res, req) => {
  res.setHeader('Content-type', 'image/jpeg');

  return res.download(getPathImage(req.params.id), req.params.id);
}

app.get('/list', (req, res, next) => wrapperError({ req, res, next }, getImageList))

app.get('/image/:id', (req, res, next) => wrapperError({ req, res, next }, getImage));

app.delete('/image/:id', (req, res, next) => wrapperError({ req, res, next }, deleteImage))

app.get('/merge', (req, res, next) => wrapperError({ req, res, next }, handleMerge))

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
