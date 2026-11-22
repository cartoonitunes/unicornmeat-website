# 🦄 Unicorn Meat Website

*A magical coin made by Ethereum in March 2016. Now wrapped and revived!*

## 🍖 What is Unicorn Meat?

Unicorn Meat is a historic Ethereum meme token created by Ethereum's Alex Van de Sande in March 2016 as part of a demonstration of token mutations, DAOs, bribable voting, and on-chain fun. 

This website celebrates the legacy of this magical token and provides a modern interface for the wrapped version that's now tradable on modern exchanges.

## ✨ Features

- **🎨 Beautiful Design**: Modern, playful UI with unicorn-themed styling
- **📱 Responsive**: Works perfectly on desktop, tablet, and mobile
- **🔗 Web3 Ready**: Interface for wrapping/unwrapping Unicorn Meat (coming soon!)
- **📊 Tokenomics**: Transparent breakdown of the token distribution
- **📖 Educational**: Learn about the fascinating history of this historic token
- **🎯 Interactive**: Fun animations and hover effects throughout

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd unicornmeat-website
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the development server**
   ```bash
   python app.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:5000`

### Deploy to Heroku

1. **Install Heroku CLI** (if you haven't already)
   ```bash
   # macOS
   brew install heroku/brew/heroku
   
   # Windows
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create a new Heroku app**
   ```bash
   heroku create your-unicorn-meat-app
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

5. **Open your app**
   ```bash
   heroku open
   ```

## 🛠️ Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Styling**: Bootstrap 5 + Custom CSS
- **Icons**: Font Awesome
- **Deployment**: Heroku
- **Assets**: Custom unicorn-themed graphics and animations

## 📁 Project Structure

```
unicornmeat-website/
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── Procfile              # Heroku deployment config
├── runtime.txt           # Python version
├── templates/
│   └── index.html        # Main website template
├── static/
│   ├── assets/
│   │   ├── css/          # Stylesheets
│   │   ├── js/           # JavaScript files
│   │   ├── images/       # Images and graphics
│   │   └── fonts/        # Custom fonts
│   └── favicon.ico       # Site favicon
└── README.md             # This file
```

## 🎨 Design Features

- **Unicorn Theme**: Pink and purple color scheme with unicorn emojis
- **Playful Animations**: Rotating elements and hover effects
- **Responsive Layout**: Adapts beautifully to all screen sizes
- **Modern Typography**: Custom fonts including Bilgres for headings
- **Interactive Elements**: Modal dialogs and smooth transitions

## 🔮 Future Features

- [ ] **Web3 Integration**: Connect wallet functionality
- [ ] **Token Wrapping**: Interface to wrap/unwrap Unicorn Meat
- [ ] **Claim System**: Claim Unicorn Meat for Unicorn holders
- [ ] **Leaderboards**: Unicorn Killers Hall of Fame
- [ ] **Community Features**: Social integration and community building

## 📚 Learn More

- [Original Unicorn Meat Contract](https://gist.github.com/alexvandesande/eca0b87da89ab28fa50c)
- [Ethereum Foundation 2016 Donation Page](https://web.archive.org/web/20160405014834/ethereum.org/donate)
- [Alex Van de Sande's Announcement](https://gist.github.com/alexvandesande/eca0b87da89ab28fa50c)

## 🤝 Contributing

Want to help make Unicorn Meat even more magical? 

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🦄 Support

If you have questions or need help, reach out to us:
- **Twitter**: [@unicornmeat](https://twitter.com/unicornmeat)
- **Telegram**: [@unicornmeat](https://t.me/unicornmeat)
- **Discord**: [Unicorn Meat Community](https://discord.gg/unicornmeat)

---

*Made with 🦄 magic and 🍖 love by the Unicorn Meat community*

*"In a world where unicorns roam the blockchain, Unicorn Meat is the rarest delicacy of all!"* ✨ 
## 🏺 Artifacts (`/artifacts`)

Historic Ethereum tokens paired with w🍖. Pages are pre-rendered static HTML so each one has its own OG/Twitter tags and share image.

To add or edit an artifact:

1. Edit `assets/data/artifacts.json` (slug, name, symbol, EIP-55 address, deployed date, one-liner, story paragraphs, supply, optional facts/accent/tradeUrl). Verify the address first with `cast code <address>`.
2. Run `python3 scripts/build-artifacts.py` (needs Pillow).
3. Commit the regenerated `artifacts/*.html`, `assets/images/artifacts/*.png` and `sitemap.xml`.

Don't hand-edit the generated HTML; change the template in the script instead.
