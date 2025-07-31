# Badge Images for ModDeck v2

This folder should contain custom badge images for enhanced Twitch chat display. The images are used to show various user badges and achievements.

## Required Badge Images

### Subscriber Badges (fugu_fps custom)
- `1-mois.png` - 1 month subscriber
- `2-mois.png` - 2 month subscriber
- `3-mois.png` - 3 month subscriber
- `6-mois.png` - 6 month subscriber
- `9-mois.png` - 9 month subscriber
- `1-an.png` - 1 year subscriber (12 months)
- `18-mois.png` - 18 month subscriber
- `2-ans.png` - 2 year subscriber (24 months)

### Prediction Badges
- `predi-1.png` - Prediction level 1
- `predi-2.png` - Prediction level 2

### Bits/Cheer Badges
- `cheer-1.png` - 1 bit
- `cheer-100.png` - 100 bits
- `cheer-1000.png` - 1,000 bits
- `cheer-5000.png` - 5,000 bits
- `cheer-10000.png` - 10,000 bits
- `cheer-25000.png` - 25,000 bits
- `cheer-50000.png` - 50,000 bits
- `cheer-100000.png` - 100,000 bits
- `cheer-500000.png` - 500,000 bits
- `cheer-1000000.png` - 1,000,000 bits
- `cheer-5000000.png` - 5,000,000 bits

### Sub Gift Badges
- `sub-gift-1.png` - 1 gift sub
- `sub-gift-5.png` - 5 gift subs
- `sub-gift-10.png` - 10 gift subs
- `sub-gift-25.png` - 25 gift subs
- `sub-gift-50.png` - 50 gift subs
- `sub-gift-100.png` - 100 gift subs
- `sub-gift-150.png` - 150 gift subs
- `sub-gift-200.png` - 200 gift subs
- `sub-gift-250.png` - 250 gift subs
- `sub-gift-300.png` - 300 gift subs
- `sub-gift-350.png` - 350 gift subs
- `sub-gift-400.png` - 400 gift subs
- `sub-gift-450.png` - 450 gift subs
- `sub-gift-500.png` - 500 gift subs
- `sub-gift-550.png` - 550 gift subs
- `sub-gift-600.png` - 600 gift subs
- `sub-gift-650.png` - 650 gift subs
- `sub-gift-700.png` - 700 gift subs
- `sub-gift-750.png` - 750 gift subs
- `sub-gift-800.png` - 800 gift subs
- `sub-gift-850.png` - 850 gift subs
- `sub-gift-900.png` - 900 gift subs
- `sub-gift-950.png` - 950 gift subs
- `sub-gift-1000.png` - 1,000 gift subs
- `sub-gift-2000.png` - 2,000 gift subs
- `sub-gift-3000.png` - 3,000 gift subs
- `sub-gift-4000.png` - 4,000 gift subs
- `sub-gift-5000.png` - 5,000 gift subs

### Gift Leader Badges
- `gifter-1.png` - Gift leader level 1
- `gifter-2.png` - Gift leader level 2
- `gifter-3.png` - Gift leader level 3

### Clips Leader Badges
- `clipe-1.png` - Clips leader level 1
- `clipe-2.png` - Clips leader level 2
- `clipe-3.png` - Clips leader level 3

### Special Badges
- `prime.png` - Prime Gaming
- `turbo.png` - Turbo
- `verified.png` - Verified
- `no-audio.png` - Audio disabled
- `listen.png` - Listen only mode
- `dj.png` - Twitch DJ
- `ambassador.png` - Twitch Ambassador
- `anonymous-cheerer.png` - Anonymous cheerer
- `Artist.png` - Artist badge

### Event/Special Badges
- `game-award-2023.png` - Game Awards 2023
- `golden-predictor-game-award-2023.png` - Golden Predictor Game Awards 2023
- `twitchcon-2025.png` - TwitchCon 2025
- `twitch-recap-2024.png` - Twitch Recap 2024
- `twitch-recap-2023.png` - Twitch Recap 2023
- `twitch-inter-2023.png` - Twitch International 2023
- `zevent-2024.png` - ZEvent 2024
- `subtember-2024.png` - Subtember 2024
- `lol-mid-season-2025.png` - League of Legends Mid-Season 2025
- `lol-mid-season-2025-support-a-streamer.png` - LoL Mid-Season 2025 Support a Streamer
- `premiere-arcane-2.png` - Arcane Season 2 Premiere
- `rplace-cake-2023.png` - r/place 2023
- `share-the-love.png` - Share the Love
- `gold-pixel-hear-2024.png` - Gold Pixel Heart 2024
- `purple-pixel-heart-2024.png` - Purple Pixel Heart 2024
- `ruby-pixel-heart-2024.png` - Ruby Pixel Heart 2024
- `clip-the-hall.png` - Clip the Hall
- `raging-wolf.png` - Raging Wolf
- `banana.png` - Gone Bananas
- `speedons-5.png` - Speedons 5
- `elden-ring-wylder.png` - Elden Ring Wylder
- `elden-ring-recluse.png` - Elden Ring Recluse
- `GLHF.png` - GLHF
- `Glitchcon.png` - Glitchcon

## Image Specifications

- **Format**: PNG with transparency support
- **Size**: 18x18 pixels (will be automatically resized if different)
- **Quality**: High quality for crisp display
- **Background**: Transparent preferred

## Fallback System

If any custom badge image fails to load, the system will automatically fall back to:
1. Default Twitch badge URLs from the official CDN
2. Generic placeholder badges
3. Text-based indicators

## Adding New Badges

To add new badge types:

1. Add the image file to this folder
2. Update the `createBadgeDisplay()` method in `renderer.js`
3. Add the badge parsing logic in `parseBadges()` method
4. Update this documentation

## Notes

- Badge images should maintain consistent visual style
- All images will be displayed at 18x18 pixels regardless of source size
- The system prioritizes custom images over default Twitch badges
- Images should be optimized for small size display
