import React from 'react';
import { NeuralNetwork } from '../lib/agent';

interface BrainVisualizerProps {
  nn: NeuralNetwork;
  inputs: number[];
}

export const BrainVisualizer: React.FC<BrainVisualizerProps> = ({ nn, inputs }) => {
  if (!nn || !nn.layerSizes || !nn.activations || !nn.weights || !inputs) return null;

  const width = 400;
  const height = 500;
  const padding = 40;

  const layerCount = nn.layerSizes.length;
  const layerX = (index: number) => padding + (index * (width - padding * 2)) / (layerCount - 1);

  const getNodesY = (count: number) => {
    const spacing = (height - padding * 2) / (count - 1 || 1);
    return Array.from({ length: count }, (_, i) => padding + i * spacing);
  };

  const allNodesY = nn.layerSizes.map(size => getNodesY(size));
  const outputLabels = ['Up', 'Down', 'Left', 'Right'];

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-xl">
      <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-4">Neural Network Architecture</h3>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Connections */}
        {nn.weights.map((layerWeights, l) =>
          layerWeights && layerWeights.map((fromWeights, i) =>
            fromWeights && fromWeights.map((weight, j) => (
              <line
                key={`w-${l}-${i}-${j}`}
                x1={layerX(l)}
                y1={allNodesY[l] ? allNodesY[l][i] : 0}
                x2={layerX(l + 1)}
                y2={allNodesY[l + 1] ? allNodesY[l + 1][j] : 0}
                stroke={weight > 0 ? '#22c55e' : '#ef4444'}
                strokeWidth={Math.max(0.1, Math.abs(weight) * (1.5 - l * 0.2))}
                strokeOpacity={0.1 + Math.abs(weight) * 0.15}
              />
            ))
          )
        )}

        {/* Nodes */}
        {nn.layerSizes.map((size, l) => (
          <g key={`layer-${l}`}>
            {allNodesY[l] && allNodesY[l].map((y, i) => {
              const isInput = l === 0;
              const isOutput = l === layerCount - 1;
              const activation = (nn.activations[l] && nn.activations[l][i] !== undefined) ? nn.activations[l][i] : 0;
              
              return (
                <g key={`node-${l}-${i}`}>
                  <circle
                    cx={layerX(l)}
                    cy={y}
                    r={isInput || isOutput ? 6 : 4}
                    fill={
                      isInput 
                        ? (inputs[i] > 0.5 ? '#f59e0b' : '#27272a')
                        : isOutput
                          ? (nn.activations[l] && nn.activations[l].length > 0 && activation === Math.max(...nn.activations[l]) ? '#f59e0b' : '#27272a')
                          : (activation > 0 ? '#22c55e' : activation < 0 ? '#ef4444' : '#27272a')
                    }
                    fillOpacity={isInput ? 1 : Math.abs(activation || 0)}
                    stroke="#52525b"
                    strokeWidth={1}
                  />
                  {isOutput && (
                    <text
                      x={layerX(l) + 12}
                      y={y + 4}
                      textAnchor="start"
                      fill="#a1a1aa"
                      fontSize="9"
                      className="font-mono"
                    >
                      {outputLabels[i]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
};
