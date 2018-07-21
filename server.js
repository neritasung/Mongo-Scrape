var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 8080;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/mongo-scraper");

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
    // request for scrape site
    axios.get("http://mspmag.com/home-and-design").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);

        // Grabbing data for title, description and link
        $("div.mp-text").each(function (i, element) {
    
        // Add the text, description and href of every link, and save them as properties of the result object
            var title = $(element).children("h3").children("a").text();
            var link = $(element).children("h3").children("a").attr("href");
            var description = $(element).children("p").children("span").text();

            // creat result object
            var result = {
                title:title,
                link:link,
                description:description,
                isSaved: false
            }
            console.log(result);

            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function (dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, send it to the client
                    return res.json(err);
                });
        });

        // If we were able to successfully scrape and save an Article, send a message to the client
        res.send("Scrape Complete");
    });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
    db.Article.find({})
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            return res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Finish the route so it finds one article using the req.params.id,
    db.Article.findOne({ _id: req.params.id })
        // and run the populate method with "note",
        .populate("note")
        // then responds with the article with the note included
        .then(function (dbArticle) {
            res.json(dbArticle)
        })
        .catch(function (err) {
            res.json(err)
        })
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // save the new note that gets posted to the Notes collection
    db.Note.create(req.body)
        // then find an article from the req.params.id
        .then(function (dbNote) {
            return db.Article, findOneAndUpdatre({ _id: req.params.id }, { note: dbNote.id }, { new: true });
        })
        // and update it's "note" property with the _id of the new note
        .then(function (dbArticle) {
            res.json(dbArticle)
        })
        .catch(function (err) {
            res.json(err)
        })
});

// Route for saving/updating article to be saved
app.put("/save/:id", function(req, res) {

    db.Article
      .findByIdAndUpdate({ _id: req.params.id }, { $set: { isSaved: true }})
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
  });
  
  // Route for getting saved article
  app.get("/save", function(req, res) {
  
    db.Article
      .find({ isSaved: true })
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
  });
  
  // Route for deleting/updating saved article
  app.put("/delete/:id", function(req, res) {
  
    db.Article
      .findByIdAndUpdate({ _id: req.params.id }, { $set: { isSaved: false }})
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
  });


// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
