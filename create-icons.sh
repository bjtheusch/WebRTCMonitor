#!/bin/bash

# Create 16x16 icon
convert -size 16x16 xc:none -fill "#667eea" -draw "circle 8,8 8,14" icons/icon16.png 2>/dev/null || {
  # Fallback: Create simple colored squares if ImageMagick is not available
  echo "Creating placeholder icons..."
  
  # Create base64-encoded 1x1 PNG and scale it
  # This is a 16x16 purple pixel
  echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAA0SURBVDiN7dOxDQAgDANBPP+MowAqasIoEA0F/t7dcAYEd3AAwZ2cAcEd3AHBnZwBwR3cAePEBzR0MWjQAAAAAElFTkSuQmCC" | base64 -d > icons/icon16.png
}

# Create 48x48 icon
convert -size 48x48 xc:none -fill "#667eea" -draw "circle 24,24 24,42" icons/icon48.png 2>/dev/null || {
  echo "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABqSURBVGiB7dSxDQAgDAPBkP0HpgAqasIoEA0F/t7dcAYEd3AAwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcEd3AHBnZwBwR3cAcGd3AE7OgZ0pZEVKwAAAABJRU5ErkJggg==" | base64 -d > icons/icon48.png
}

# Create 128x128 icon
convert -size 128x128 xc:none -fill "#667eea" -draw "circle 64,64 64,112" icons/icon128.png 2>/dev/null || {
  echo "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADeSURBVHic7dOxDQAwCANBkP0HpgAqasIoEA0F/t7dcAYEd3AAwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcEd3AHBnZwBwR3cAcGdnAHBHdwBwZ2cAcGd3AE8WAuBmStNWAAAAABJRU5ErkJggg==" | base64 -d > icons/icon128.png
}

echo "Icons created!"
