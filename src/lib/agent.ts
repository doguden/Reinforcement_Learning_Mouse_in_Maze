export class NeuralNetwork {
  inputSize: number;
  layerSizes: number[]; // Sizes of all layers including input and output
  outputSize: number;

  weights: number[][][]; // weights[layerIndex][fromNeuron][toNeuron]
  biases: number[][]; // biases[layerIndex][neuronIndex]
  activations: number[][]; // activations[layerIndex][neuronIndex]

  constructor(inputSize: number, hiddenSizes: number[], outputSize: number) {
    this.inputSize = inputSize;
    this.outputSize = outputSize;
    this.layerSizes = [inputSize, ...hiddenSizes, outputSize];

    this.weights = [];
    this.biases = [];
    this.activations = [];

    for (let i = 0; i < this.layerSizes.length - 1; i++) {
      const fromSize = this.layerSizes[i];
      const toSize = this.layerSizes[i + 1];

      const layerWeights = Array.from({ length: fromSize }, () =>
        Array.from({ length: toSize }, () => Math.random() * 2 - 1)
      );
      this.weights.push(layerWeights);
      this.biases.push(Array(toSize).fill(0));
    }

    // Initialize activations with zeros
    for (let i = 0; i < this.layerSizes.length; i++) {
      this.activations.push(Array(this.layerSizes[i]).fill(0));
    }
  }

  forward(inputs: number[]): number[] {
    this.activations[0] = [...inputs];

    for (let i = 0; i < this.weights.length; i++) {
      const fromActivations = this.activations[i];
      const layerWeights = this.weights[i];
      const layerBiases = this.biases[i];
      const toSize = this.layerSizes[i + 1];
      const isOutputLayer = i === this.weights.length - 1;

      const nextActivations = Array(toSize).fill(0);
      for (let to = 0; to < toSize; to++) {
        let sum = layerBiases[to];
        for (let from = 0; from < fromActivations.length; from++) {
          sum += fromActivations[from] * layerWeights[from][to];
        }
        nextActivations[to] = isOutputLayer ? sum : Math.tanh(sum);
      }
      this.activations[i + 1] = nextActivations;
    }

    return this.activations[this.activations.length - 1];
  }

  train(inputs: number[], targetQ: number[], learningRate: number) {
    const outputs = this.forward(inputs);
    const layerCount = this.layerSizes.length;
    
    // Errors for each layer
    const errors: number[][] = Array.from({ length: layerCount }, (_, i) => Array(this.layerSizes[i]).fill(0));

    // Output layer error
    for (let i = 0; i < this.outputSize; i++) {
      errors[layerCount - 1][i] = targetQ[i] - outputs[i];
    }

    // Backpropagate errors
    for (let i = layerCount - 2; i >= 1; i--) {
      const layerWeights = this.weights[i];
      const nextErrors = errors[i + 1];
      const layerActivations = this.activations[i];

      for (let j = 0; j < this.layerSizes[i]; j++) {
        let error = 0;
        for (let k = 0; k < this.layerSizes[i + 1]; k++) {
          error += nextErrors[k] * layerWeights[j][k];
        }
        errors[i][j] = error * (1 - layerActivations[j] * layerActivations[j]); // tanh derivative
      }
    }

    // Update weights and biases
    for (let i = 0; i < this.weights.length; i++) {
      const fromActivations = this.activations[i];
      const nextErrors = errors[i + 1];
      const layerWeights = this.weights[i];
      const layerBiases = this.biases[i];

      for (let from = 0; from < fromActivations.length; from++) {
        for (let to = 0; to < nextErrors.length; to++) {
          layerWeights[from][to] += learningRate * nextErrors[to] * fromActivations[from];
        }
      }
      for (let to = 0; to < nextErrors.length; to++) {
        layerBiases[to] += learningRate * nextErrors[to];
      }
    }
  }
}

export class RLAgent {
  nn: NeuralNetwork;
  gamma = 0.95;
  epsilon = 0.2;
  learningRate = 0.01;

  constructor(hiddenSizes: number[] = [12, 8]) {
    // Inputs: WallU, WallD, WallL, WallR, NormX, NormY
    this.nn = new NeuralNetwork(6, hiddenSizes, 4);
  }

  getAction(state: number[]): number {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * 4);
    }
    const qValues = this.nn.forward(state);
    return qValues.indexOf(Math.max(...qValues));
  }

  update(state: number[], action: number, reward: number, nextState: number[], done: boolean) {
    const currentQ = this.nn.forward(state);
    let target = reward;
    if (!done) {
      const nextQ = this.nn.forward(nextState);
      target += this.gamma * Math.max(...nextQ);
    }
    
    const targetQ = [...currentQ];
    targetQ[action] = target;

    this.nn.train(state, targetQ, this.learningRate);
  }
}
