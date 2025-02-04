# MLB Fantasy Team Builder

An interactive baseball fantasy team builder powered by Google Cloud's Gemini AI.

## Project Overview

Build your dream baseball team with AI-powered player scoring and an intuitive baseball field interface. Place players in their optimal positions, track their performance, and compete on the global leaderboard.

## Features

- Interactive baseball field visualization
- AI-powered player scoring using Google's Gemini 1.5 Pro
- Dynamic player cards with stats and position info
- Real-time leaderboard system
- Intelligent position eligibility rules
- Bench management system
- Team performance tracking

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn-ui
- **Backend**: Supabase
- **AI**: Google Cloud Gemini 1.5 Pro
- **Authentication**: Clerk
- **Build Tool**: Vite

## Getting Started

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
```

2. Navigate to the project directory:
```sh
cd <YOUR_PROJECT_NAME>
```

3. Install dependencies:
```sh
npm i
```

4. Start the development server:
```sh
npm run dev
```

## Project Structure

- `/src/components/BaseballField.tsx` - Main baseball field visualization and team management
- `/src/components/Leaderboard.tsx` - Global leaderboard system
- `/src/lib/admin.ts` - Supabase configuration and admin functions

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- MLB™ for providing baseball data
- Google Cloud for Gemini AI capabilities
- The open-source community for various tools and libraries used
