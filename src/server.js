const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

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

app.get('/list', (req, res, next) => wrapperError({ req, res, next }, getImageList))

// app.get('/list', (req, res) => {
//   const list = db.find().map((img) => img.toJSON());
//   return res.json(list);
// });

// app.get('/upload', (req, res) => {
//     res.send(`
//     <form enctype="multipart/form-data" action="/upload" method="POST">
//         <input name="image" type="file" req />
//         <button type="submit">
//             Загрузите файл с картинкой
//         </button>
//     </form>`)
// })

// GET /image/:id  — скачать изображение с заданным id
// app.get('/image/:id', async (req, res, next) => {
//   const imgId = req.params.id;
//   const img = db.findOne(imgId);

//   if (!img) {
//     res.statusCode = 404;
//     return next(new Error('Not found'));
//   }

//   const pathToFile = img.getFullImagePath();
//   const isFileExists = await exists();
//   if (!isFileExists) {
//     res.statusCode = 404;
//     return next(new Error('Not found'));
//   }

//   res.setHeader('Content-type', 'image/jpeg');
//   return res.download(pathToFile, img.id + '.jpg');
// });

const getImageAnswerServer = (res, req) => {
  res.setHeader('Content-type', 'image/jpeg');

  return res.download(getPathImage(req.params.id), req.params.id);
}

const getImage = ({ req, res }) => fs.access(getPathImage(req.params.id), (err) => err ? res.status(404).json('Not Found') : getImageAnswerServer(res, req));

app.get('/image/:id', (req, res, next) => wrapperError({ req, res, next }, getImage));

const deleteImage = ({ req, res }) => fs.unlink(getPathImage(req.params.id), (err) => err ? res.status(404).json('Not Found') : res.status(200).json({ id: req.params.id }));

app.delete('/delete/:id', (req, res, next) => wrapperError({ req, res, next }, deleteImage))

// GET /merge?front=<id>&back=<id>&color=145,54,32&threshold=5  — замена фона у изображения
// app.get('/merge', (req, res, next) => {
//   const targetImg = db.findOne(req.query.front);
//   if (!targetImg) {
//     res.statusCode = 404;
//     return next(new Error('Front image not found'));
//   }
//   const target = fs.createReadStream(targetImg.getFullImagePath());

//   const backgroundImg = db.findOne(req.query.back);
//   if (!backgroundImg) {
//     res.statusCode = 404;
//     return next(new Error('Back image not found'));
//   }
//   const background = fs.createReadStream(backgroundImg.getFullImagePath());

//   const colorToReplace = (req.query.color &&
//     req.query.color.split(',').map((n) => parseInt(n, 10))) || [200, 50, 52];
//   const threshold =
//     (req.query.threshold && parseInt(req.query.threshold, 10)) || 0;

//   console.log(colorToReplace, threshold);

//   res.setHeader('Content-type', 'image/jpeg');

//   replaceBackground(target, background, colorToReplace, threshold).then(
//     (readableStream) => {
//       readableStream.pipe(res);
//     }
//   );
// });

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
