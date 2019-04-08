/**
* Obstacle.
* @param {HTMLCanvasCtx} canvasCtx
* @param {Obstacle.type} type
* @param {image} obstacleImg Image sprite.
* @param {Object} dimensions
* @param {number} gapCoefficient Mutipler in determining the gap.
* @param {number} speed
*/
class Obstacle {
  constructor(canvasCtx, type, obstacleImg, dimensions,
    gapCoefficient, speed) {
    this.canvasCtx = canvasCtx
    this.image = obstacleImg
    this.typeConfig = type
    this.gapCoefficient = gapCoefficient
    this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH)
    this.dimensions = dimensions
    this.remove = false
    this.xPos = 0
    this.yPos = this.typeConfig.yPos
    this.width = 0
    this.collisionBoxes = []
    this.gap = 0
    this.init(speed)
  }

  /**
  * Coefficient for calculating the maximum gap.
  * @const
  */
  static get MAX_GAP_COEFFICIENT() {
    return 1.5
  }

  /**
  * Maximum obstacle grouping count.
  * @const
  */
  static get MAX_OBSTACLE_LENGTH() {
    return 3
  }

  /**
  * Initialise the DOM for the obstacle.
  * @param {number} speed
  */
  init(speed) {
    this.cloneCollisionBoxes()

    // Only allow sizing if we're at the right speed.
    if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
      this.size = 1
    }

    this.width = this.typeConfig.width * this.size
    this.xPos = this.dimensions.WIDTH - this.width
    this.draw()

    // Make collision box adjustments,
    // Central box is adjusted to the size as one box.
    // ____ ______ ________
    // _| |-| _| |-| _| |-|
    // | |<->| | | |<--->| | | |<----->| |
    // | | 1 | | | | 2 | | | | 3 | |
    // |_|___|_| |_|_____|_| |_|_______|_|
    //
    if (this.size > 1) {
      this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
        this.collisionBoxes[2].width
      this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width
    }

    this.gap = this.getGap(this.gapCoefficient, speed)
  }

  /**
  * Draw and crop based on size.
  */
  draw() {
    let sourceWidth = this.typeConfig.width
    let sourceHeight = this.typeConfig.height

    if (IS_HIDPI) {
      sourceWidth = sourceWidth * 2
      sourceHeight = sourceHeight * 2
    }

    // Sprite
    let sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1))
    this.canvasCtx.drawImage(this.image,
      sourceX, 0,
      sourceWidth * this.size, sourceHeight,
      this.xPos, this.yPos,
      this.typeConfig.width * this.size, this.typeConfig.height)
  }

  /**
  * Obstacle frame update.
  * @param {number} deltaTime
  * @param {number} speed
  */
  update(deltaTime, speed) {
    if (!this.remove) {
      this.xPos -= Math.floor((speed * FPS / 1000) * deltaTime)
      this.draw()
      if (!this.isVisible()) {
        this.remove = true
      }
    }
  }

  /**
  * Calculate a random gap size.
  * - Minimum gap gets wider as speed increses
  * @param {number} gapCoefficient
  * @param {number} speed
  * @return {number} The gap size.
  */
  getGap(gapCoefficient, speed) {
    let minGap = Math.round(this.width * speed +
      this.typeConfig.minGap * gapCoefficient)
    let maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT)
    return getRandomNum(minGap, maxGap)
  }

  /**
  * Check if obstacle is visible.
  * @return {boolean} Whether the obstacle is in the game area.
  */
  isVisible() {
    return this.xPos + this.width > 0
  }

  /**
  * Make a copy of the collision boxes, since these will change based on
  * obstacle type and size.
  */
  cloneCollisionBoxes() {
    let collisionBoxes = this.typeConfig.collisionBoxes
    for (let i = collisionBoxes.length - 1; i >= 0; i--) {
      this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x,
        collisionBoxes[i].y, collisionBoxes[i].width,
        collisionBoxes[i].height)
    }
  }

  /**
  * Obstacle definitions.
  * minGap: minimum pixel space betweeen obstacles.
  * multipleSpeed: Speed at which multiples are allowed.
  */
  static get types() {
    return [
      {
        type: 'CACTUS_SMALL',
        className: ' cactus cactus-small ',
        width: 17,
        height: 35,
        yPos: 105,
        multipleSpeed: 3,
        minGap: 120,
        collisionBoxes: [
          new CollisionBox(0, 7, 5, 27),
          new CollisionBox(4, 0, 6, 34),
          new CollisionBox(10, 4, 7, 14)
        ]
      },
      {
        type: 'CACTUS_LARGE',
        className: ' cactus cactus-large ',
        width: 25,
        height: 50,
        yPos: 90,
        multipleSpeed: 6,
        minGap: 120,
        collisionBoxes: [
          new CollisionBox(0, 12, 7, 38),
          new CollisionBox(8, 0, 7, 49),
          new CollisionBox(13, 10, 10, 38)
        ]
      }
    ]
  }
}
