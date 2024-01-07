const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Note = require('./models/Note');



const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb+srv://nipanepratik12:pratiknipane12@cluster0.al4m04w.mongodb.net/noteapp32?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });


app.use(session({ secret: 'secret', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');


passport.use(new LocalStrategy((username, password, done) => {
  User.findOne({ username: username })
    .then(user => {
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      user.comparePassword(password)
        .then(isMatch => {
          if (!isMatch) {
            return done(null, false, { message: 'Incorrect password.' });
          }
          return done(null, user);
        })
        .catch(err => done(err));
    })
    .catch(err => done(err));
}));


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
  
    // Send an internal server error response
    res.status(500).send('Internal Server Error');
  });



passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
      .then(user => done(null, user))
      .catch(err => done(err));
  });
  

app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',  // Redirect to the dashboard on successful login
    failureRedirect: '/login',
  }));
  

app.get('/register', (req, res) => {
  res.render('register.ejs');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({ username, password: hashedPassword });
  newUser.save();

  res.redirect('/login');
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
  const notes = await Note.find({ user: req.user._id });
  res.render('dashboard.ejs', { user: req.user, notes });
});

// Assuming this is where you handle logout
app.get('/logout', (req, res) => {
    req.logout(function(err) {
      if (err) {
        return next(err);
      }
      // Redirect or respond as needed after logout
      res.redirect('/');
    });
  });
  

app.get('/note/add', isAuthenticated, (req, res) => {
    res.render('addNote.ejs');
});


app.post('/note/add', isAuthenticated, async (req, res) => {
    const { title, content } = req.body;
  
    // Assuming you have a Note model
    const newNote = new Note({
      title,
      content,
      user: req.user._id, // Attach the user ID to the note
    });
  
    await newNote.save();
  
    res.redirect('/dashboard');
});


app.get('/note/:id/edit', isAuthenticated, async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
  
      if (!note) {
        return res.status(404).send('Note not found');
      }
  
      res.render('editNote.ejs', { note });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

app.post('/note/:id/edit', isAuthenticated, async (req, res) => {
    try {
      const { title, content } = req.body;
      const note = await Note.findById(req.params.id);
  
      if (!note) {
        return res.status(404).send('Note not found');
      }
  
      note.title = title;
      note.content = content;
      await note.save();
  
      res.redirect('/dashboard');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});


app.get('/note/:id/delete', isAuthenticated, async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
  
      if (!note) {
        return res.status(404).send('Note not found');
      }
  
      res.render('deleteNote.ejs', { note });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

app.post('/note/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).send('Note not found');
    }

    await note.deleteOne(); // Use deleteOne method to remove the note

    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
