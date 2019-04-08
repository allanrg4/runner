/**
* Game over panel.
* @param {!HTMLCanvasElement} canvas
* @param {!HTMLImage} textSprite
* @param {!HTMLImage} restartImg
* @param {!Object} dimensions Canvas dimensions.
* @constructor
*/
class GameOverPanel {
  constructor(canvas, textSprite, restartImg, dimensions) {
    this.canvas = canvas
    this.canvasCtx = canvas.getContext('2d')
    this.canvasDimensions = dimensions
    this.textSprite = textSprite
    this.restartImg = restartImg
    this.draw()
  }

  /**
  * Dimensions used in the panel.
  * @enum {number}
  */
  static get dimensions() {
    return {
      TEXT_X: 0,
      TEXT_Y: 13,
      TEXT_WIDTH: 191,
      TEXT_HEIGHT: 11,
      RESTART_WIDTH: 36,
      RESTART_HEIGHT: 32
    }
  }

  /**
  * Update the panel dimensions.
  * @param {number} width New canvas width.
  * @param {number} opt_height Optional new canvas height.
  */
  updateDimensions(width, opt_height) {
    this.canvasDimensions.WIDTH = width

    if (opt_height) {
      this.canvasDimensions.HEIGHT = opt_height
    }
  }

  /**
  * Draw the panel.
  */
  draw() {
    let dimensions = GameOverPanel.dimensions
    let centerX = this.canvasDimensions.WIDTH / 2

    // Game over text.
    let textSourceX = dimensions.TEXT_X
    let textSourceY = dimensions.TEXT_Y
    let textSourceWidth = dimensions.TEXT_WIDTH
    let textSourceHeight = dimensions.TEXT_HEIGHT
    let textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2))
    let textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3)
    let textTargetWidth = dimensions.TEXT_WIDTH
    let textTargetHeight = dimensions.TEXT_HEIGHT
    let restartSourceWidth = dimensions.RESTART_WIDTH
    let restartSourceHeight = dimensions.RESTART_HEIGHT
    let restartTargetX = centerX - (dimensions.RESTART_WIDTH / 2)
    let restartTargetY = this.canvasDimensions.HEIGHT / 2

    if (IS_HIDPI) {
      textSourceY *= 2
      textSourceX *= 2
      textSourceWidth *= 2
      textSourceHeight *= 2
      restartSourceWidth *= 2
      restartSourceHeight *= 2
    }

    // Game over text from sprite.
    this.canvasCtx.drawImage(this.textSprite,
      textSourceX, textSourceY, textSourceWidth, textSourceHeight,
      textTargetX, textTargetY, textTargetWidth, textTargetHeight)

    // Restart button.
    this.canvasCtx.drawImage(this.restartImg, 0, 0,
      restartSourceWidth, restartSourceHeight,
      restartTargetX, restartTargetY, dimensions.RESTART_WIDTH,
      dimensions.RESTART_HEIGHT)
  }
}
