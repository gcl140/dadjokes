# Dad Jokes Web Application

A Django-based web application for sharing and enjoying dad jokes! This platform allows users to create, share, like, and comment on dad jokes with customizable styling and social authentication.

## Features

### Core Features
- 🎭 **Create & Share Jokes**: Post your best dad jokes with custom styling
- ❤️ **Like System**: Like your favorite jokes and see what others enjoy
- 💬 **Comments**: Engage with the community through joke comments
- 👤 **User Profiles**: Personalized profiles with profile pictures and about sections
- 🔐 **Authentication**: Email-based registration with account activation
- 🌐 **Google OAuth**: Quick sign-in with Google authentication

### Customization
- 🎨 **Custom Styling**: Personalize jokes with:
  - Background colors
  - Text colors
  - Font types (Arial, Times New Roman, Comic Sans MS, and more)
- 🔀 **Random Shuffle**: Jokes are shuffled for a fresh experience every time

### User Management
- ✉️ **Email Verification**: Secure account activation via email
- 🔑 **Password Reset**: Easy password recovery system
- 📝 **Profile Editing**: Update your profile information and picture

## Tech Stack

### Backend
- **Django 5.2.5**: Python web framework
- **Python 3.x**: Programming language
- **SQLite3**: Database (default)

### Frontend
- **HTML/CSS/JavaScript**: Core web technologies
- **Django Templates**: Server-side rendering

### Key Dependencies
- **social-auth-app-django**: Google OAuth integration
- **Pillow**: Image processing for profile pictures
- **django-phonenumber-field**: Phone number validation
- **django-widget-tweaks**: Enhanced form rendering
- **django-browser-reload**: Development hot-reload

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment (recommended)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/gcl140/dadjokes.git
   cd dadjokes
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r req.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_OAUTH2_KEY=your_google_oauth_key
   GOOGLE_OAUTH2_SECRET=your_google_oauth_secret
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   ```

8. **Access the application**
   Open your browser and navigate to `http://127.0.0.1:8000/`

## Configuration

### Email Settings
The application uses Gmail SMTP for sending activation emails. Update the following in `dadjokes/settings.py`:

```python
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
```

**Note**: Use an [App Password](https://support.google.com/accounts/answer/185833) for Gmail, not your regular password.

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://127.0.0.1:8000/oauth/complete/google-oauth2/`
   - `http://localhost:8000/oauth/complete/google-oauth2/`
6. Add the credentials to your `.env` file

### Static Files
For production, collect static files:
```bash
python manage.py collectstatic
```

## Usage

### Creating an Account
1. Click on "Register" from the landing page
2. Fill in your details (username, email, password)
3. Check your email for the activation link
4. Click the activation link to activate your account
5. Log in with your credentials

### Posting a Joke
1. Log in to your account
2. Navigate to "Create Joke"
3. Enter your joke content
4. Customize the appearance (colors, font)
5. Add an optional description
6. Submit the joke

### Interacting with Jokes
- **Like**: Click the heart icon to like a joke
- **Comment**: Click the comment icon and add your thoughts
- **Delete**: Remove your own jokes or comments (only your own)

### Profile Management
1. Click on your username to view your profile
2. See all your posted jokes
3. Edit your profile information and picture
4. View statistics (jokes posted, likes received)

## Project Structure

```
dadjokes/
├── content/                 # Jokes app
│   ├── migrations/         # Database migrations
│   ├── templates/          # Content templates
│   ├── models.py           # Joke, JokeLike, JokeComment models
│   ├── views.py            # Joke-related views
│   ├── urls.py             # Content URL patterns
│   └── forms.py            # Joke forms
├── yuzzaz/                  # User authentication app
│   ├── migrations/         # Database migrations
│   ├── templates/          # Auth templates
│   ├── models.py           # CustomUser model
│   ├── views.py            # Auth views
│   ├── urls.py             # Auth URL patterns
│   ├── forms.py            # User forms
│   └── tokens.py           # Email verification tokens
├── dadjokes/               # Project settings
│   ├── settings.py         # Django settings
│   ├── urls.py             # Root URL configuration
│   ├── wsgi.py             # WSGI config
│   └── asgi.py             # ASGI config
├── static/                  # Static files (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── media/                   # User-uploaded files
├── manage.py               # Django management script
└── req.txt                 # Python dependencies
```

## API Endpoints

### Content (Jokes)
- `GET /` - Home page with joke feed
- `GET /api/jokes/` - Fetch all jokes (JSON)
- `GET /api/jokes/<id>/` - Fetch specific joke (JSON)
- `POST /create-joke/` - Create a new joke (requires login)
- `DELETE /delete-joke/<id>/` - Delete a joke (requires login)
- `POST /toggle-like/<id>/` - Like/unlike a joke (requires login)
- `GET /fetch-comments/<id>/` - Fetch comments for a joke
- `POST /post-comment/<id>/` - Post a comment (requires login)
- `DELETE /delete-comment/<id>/` - Delete a comment (requires login)

### Authentication
- `GET /accounts/login/` - Login page
- `POST /accounts/login/` - Process login
- `GET /accounts/register/` - Registration page
- `POST /accounts/register/` - Process registration
- `GET /accounts/logout/` - Logout
- `GET /accounts/activate/<uidb64>/<token>/` - Email activation
- `GET /accounts/password-reset/` - Password reset request
- `GET /oauth/login/google-oauth2/` - Google OAuth login

### Profiles
- `GET /accounts/profile/<user_id>/` - View user profile
- `POST /accounts/edit-profile/` - Edit profile (requires login)

## Database Models

### CustomUser
- Extends Django's AbstractUser
- Fields: username, email, profile_picture, about
- Unique email and username

### Joke
- content (TextField): The joke text
- description (TextField): Optional description
- bg_color (CharField): Background color (hex)
- text_color (CharField): Text color (hex)
- font_type (CharField): Font family
- bg_music (CharField): Background music URL
- joke_by (ForeignKey): User who created the joke
- created_at (DateTimeField): Creation timestamp
- likers (ManyToManyField): Users who liked the joke

### JokeLike
- user (ForeignKey): User who liked
- joke (ForeignKey): Joke that was liked
- created_at (DateTimeField): Like timestamp
- Unique constraint: (user, joke)

### JokeComment
- user (ForeignKey): User who commented
- joke (ForeignKey): Joke being commented on
- comment_text (TextField): Comment content
- created_at (DateTimeField): Comment timestamp

## Development

### Running Tests
```bash
python manage.py test
```

### Creating Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Accessing Admin Panel
1. Create a superuser (if not already done)
2. Navigate to `http://127.0.0.1:8000/admyn/`
3. Log in with superuser credentials

### Debug Mode
The project runs in DEBUG mode by default. For production:
1. Set `DEBUG = False` in settings.py
2. Configure `ALLOWED_HOSTS`
3. Use a production-grade database (PostgreSQL, MySQL)
4. Set up proper static file serving (nginx, WhiteNoise)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add comments for complex logic
- Write tests for new features

## Security Notes

⚠️ **Important Security Reminders:**
- Never commit the `.env` file or sensitive credentials
- Change the `SECRET_KEY` in production
- Use environment variables for sensitive data
- Keep dependencies updated regularly
- Disable DEBUG mode in production
- Use HTTPS in production
- Implement rate limiting for API endpoints

## License

This project is open source and available under the [MIT License](LICENSE).

## Contact

- GitHub: [@gcl140](https://github.com/gcl140)
- Repository: [https://github.com/gcl140/dadjokes](https://github.com/gcl140/dadjokes)

## Acknowledgments

- Django community for the excellent framework
- Contributors and users of this project
- All the dad joke enthusiasts out there! 🎉

---

**Made with ❤️ for spreading laughter, one dad joke at a time!**
