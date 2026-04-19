## NeuroMaze
A reinforcement learning training environment featuring a mouse navigating through a 2D maze with adjustable difficulty levels. Designed for teaching purposes.

   ![NeuroMaze Interface](/assets/images/untitled.png)

## Features

- **Interactive Maze Environment**: 30×120 grid with periodic boundary conditions on X-axis
- **Real-time Neural Network Visualization**: Watch the agent's brain learn in real-time  
- **Configurable Difficulty Levels**: Novice through Insane
- **Adjustable Neural Network Architecture**: Control the depth of hidden layers
- **Training Analytics**: Track reward accumulation and episode progress with trend analysis
- **Flexible Speed Controls**: Adjust simulation speed from 1-100%



## How It Works

The agent perceives the maze environment through:
- 6 directional sensors (4-cell range)
- Current X and Y coordinates

It learns via Q-learning with a neural network approximator and optimizes its navigation strategy over multiple episodes.

## Run Locally

**Prerequisites:** Node.js 18+

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

## Building for Production

```bash
npm run build
```
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.