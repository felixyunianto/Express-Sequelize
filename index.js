const express = require('express');
const app = express();
const Sequelize = require('sequelize');
const bodyParser = require('body-parser');
const {
    check,
    validationResult
} = require('express-validator');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.listen(3001, () => console.log("Server berjalan pada http://localhost:3001"))


const sequelize = new Sequelize('bookstore', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    }
});


const book = sequelize.define('book', {
    'id': {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    'isbn': Sequelize.STRING,
    'name': Sequelize.STRING,
    'year': Sequelize.STRING,
    'author': Sequelize.STRING,
    'description': Sequelize.TEXT,
    'image': {
        type: Sequelize.STRING,
        get() {
            const image = this.getDataValue('image');
            return "/img/" + image;
        }
    },
    'createdAt': {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
    'updatedAt': {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
}, {
    freezeTableName: true,
})

app.get('/book/', (req, res) => {
    book.findAll().then(book => {
        if (book.length == 0) {
            res.json('Not available data');
        } else {
            res.json(book);
        }
    })
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static('public'));
const uploadDir = '/img/';
const storage = multer.diskStorage({
    destination: "./public" + uploadDir,
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            if (err) return cb(err)

            cb(null, raw.toString('hex') + path.extname(file.originalname))
        })
    }
})

const upload = multer({
    storage: storage,
    dest: uploadDir
});

app.post('/book/', [
    upload.single('image'),

    check('isbn')
    .isLength({
        min: 5
    })
    .isNumeric()
    .custom(value => {
        return book.findOne({
            where: {
                isbn: value
            }
        }).then(b => {
            if (b) {
                throw new Error('ISBN already in use');
            }
        })
    }),
    check('name')
    .isLength({
        min: 2
    }),
    check('year')
    .isLength({
        min: 4,
        max: 4
    })
    .isNumeric(),
    check('author')
    .isLength({
        min: 2
    }),
    check('description')
    .isLength({
        min: 10
    })

], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            errors: errors.mapped()
        });
    }

    book.create({
        name: req.body.name,
        isbn: req.body.isbn,
        year: req.body.year,
        author: req.body.author,
        description: req.body.description,
        image: req.file === undefined ? "" : req.file.filename
    }).then(newBook => {
        res.json({
            "status": "success",
            "message": "Book added",
            "data": newBook
        })
    })
})

app.put('/book/', [
    //File upload (karena pakai multer, tempatkan di posisi pertama agar membaca multipar form-data)
    upload.single('image'),

    //Set form validation rule
    check('isbn')
    .isLength({
        min: 5
    })
    .isNumeric()
    .custom(value => {
        return book.findOne({
            where: {
                isbn: value
            }

        }).then(b => {
            fs.unlink('public'+b.image, (err)=>{
                if (err) throw err;
                console.log('Successfully deleted');
            })
            if (!b) {
                throw new Error('ISBN not found');
            }
        })
    }),
    check('name')
    .isLength({
        min: 2
    }),
    check('year')
    .isLength({
        min: 4,
        max: 4
    })
    .isNumeric(),
    check('author')
    .isLength({
        min: 2
    }),
    check('description')
    .isLength({
        min: 10
    })

], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            errors: errors.mapped()
        });
    }
    const update = {
        name: req.body.name,
        isbn: req.body.isbn,
        year: req.body.year,
        author: req.body.author,
        description: req.body.description,
        image: req.file === undefined ? "" : req.file.filename
    }
    book.update(update, {
            where: {
                isbn: req.body.isbn
            }
        })
        .then(affectedRow => {
            return book.findOne({
                where: {
                    isbn: req.body.isbn
                }
            })
        })
        .then(b => {
            res.json({
                "status": "success",
                "message": "Book updated",
                "data": b
            })
        })
})

app.delete('/book/:isbn', [
    
    check('isbn')
    .isLength({
        min: 5
    })
    .isNumeric()
    .custom(value => {
        return book.findOne({
            where: {
                isbn: value
            }
        }).then(b => {
            fs.unlink('public'+b.image, (err)=>{
                if (err) throw err;
                console.log('Successfully deleted');
            })
            if (!b) {
                throw new Error('ISBN not found');
            }
        })
    }),
    
],
(req, res) => {
    book.destroy( {
            where: {
                isbn: req.params.isbn
            }
        })
        .then(affectedRow => {
            if (affectedRow) {
                return {
                    "status": "success",
                    "message": "Book deleted"
                }

            }
            
            return {
                "status": "error",
                "message": "Failed",
            }

        })
        .then(r => {
            res.json(r)
        })
})