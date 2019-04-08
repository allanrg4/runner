/**
* Horizon Line.
* Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
* @param {HTMLCanvasElement} canvas
* @param {HTMLImage} bgImg Horizon line sprite.
* @constructor
*/
class HorizonLine {
  constructor(canvas, bgImg) {
    this.image = bgImg
    this.canvas = canvas
    this.canvasCtx = canvas.getContext('2d')
    this.sourceDimensions = {}
    this.dimensions = HorizonLine.dimensions
    this.sourceXPos = [0, this.dimensions.WIDTH]
    this.xPos = []
    this.yPos = 0
    this.bumpThreshold = 0.5
    this.setSourceDimensions()
    this.draw()
  }

  /**
  * Horizon line dimensions.
  * @enum {number}
  */
  static get dimensions() {
    return {
      WIDTH: 600,
      HEIGHT: 12,
      YPOS: 127
    }
  }

  /**
  * Set the source dimensions of the horizon line.
  */
  setSourceDimensions() {
    for (var dimension in HorizonLine.dimensions) {
      if (IS_HIDPI) {
        if (dimension != 'YPOS') {
          this.sourceDimensions[dimension] =
            HorizonLine.dimensions[dimension] * 2
        }
      } else {
        this.sourceDimensions[dimension] =
          HorizonLine.dimensions[dimension]
      }

      this.dimensions[dimension] = HorizonLine.dimensions[dimension]
    }

    this.xPos = [0, HorizonLine.dimensions.WIDTH]
    this.yPos = HorizonLine.dimensions.YPOS
  }

  /**
  * Return the crop x position of a type.
  */
  getRandomType() {
    return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0
  }

  /**
  * Draw the horizon line.
  */
  draw() {
    this.canvasCtx.drawImage(
      this.image, this.sourceXPos[0], 0,
      this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
      this.xPos[0], this.yPos,
      this.dimensions.WIDTH, this.dimensions.HEIGHT)

    this.canvasCtx.drawImage(
      this.image, this.sourceXPos[1], 0,
      this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
      this.xPos[1], this.yPos,
      this.dimensions.WIDTH, this.dimensions.HEIGHT)
  }

  /**
  * Update the x position of an indivdual piece of the line.
  * @param {number} pos Line position.
  * @param {number} increment
  */
  updateXPos(pos, increment) {
    var line1 = pos
    var line2 = pos == 0 ? 1 : 0
    this.xPos[line1] -= increment
    this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH

    if (this.xPos[line1] <= -this.dimensions.WIDTH) {
      this.xPos[line1] += this.dimensions.WIDTH * 2
      this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH
      this.sourceXPos[line1] = this.getRandomType()
    }
  }

  /**
  * Update the horizon line.
  * @param {number} deltaTime
  * @param {number} speed
  */
  update(deltaTime, speed) {
    let increment = Math.floor(speed * (FPS / 1000) * deltaTime)

    if (this.xPos[0] <= 0) {
      this.updateXPos(0, increment)
    } else {
      this.updateXPos(1, increment)
    }

    this.draw()
  }

  /**
  * Reset horizon to the starting position.
  */
  reset() {
    this.xPos[0] = 0
    this.xPos[1] = HorizonLine.dimensions.WIDTH
  }
}
