/**
* Horizon background class.
* @param {HTMLCanvasElement} canvas
* @param {Array.<HTMLImageElement>} images
* @param {object} dimensions Canvas dimensions.
* @param {number} gapCoefficient
* @constructor
*/
class Horizon {
  constructor(canvas, images, dimensions, gapCoefficient) {
    this.canvas = canvas
    this.canvasCtx = this.canvas.getContext('2d')
    this.config = Horizon.config
    this.dimensions = dimensions
    this.gapCoefficient = gapCoefficient
    this.obstacles = []
    this.horizonOffsets = [0, 0]
    this.cloudFrequency = this.config.CLOUD_FREQUENCY

    // Cloud
    this.clouds = []
    this.cloudImg = images.CLOUD
    this.cloudSpeed = this.config.BG_CLOUD_SPEED

    // Horizon
    this.horizonImg = images.HORIZON
    this.horizonLine = null

    // Obstacles
    this.obstacleImgs = {
      CACTUS_SMALL: images.CACTUS_SMALL,
      CACTUS_LARGE: images.CACTUS_LARGE
    }

    this.init()
  }

  /**
  * Horizon config.
  * @enum {number}
  */
  static get config() {
    return {
      BG_CLOUD_SPEED: 0.2,
      BUMPY_THRESHOLD: .3,
      CLOUD_FREQUENCY: .5,
      HORIZON_HEIGHT: 16,
      MAX_CLOUDS: 6
    }
  }

  /**
  * Initialise the horizon. Just add the line and a cloud. No obstacles.
  */
  init() {
    this.addCloud()
    this.horizonLine = new HorizonLine(this.canvas, this.horizonImg)
  }

  /**
  * @param {number} deltaTime
  * @param {number} currentSpeed
  * @param {boolean} updateObstacles Used as an override to prevent
  * the obstacles from being updated / added. This happens in the
  * ease in section.
  */
  update(deltaTime, currentSpeed, updateObstacles) {
    this.runningTime += deltaTime
    this.horizonLine.update(deltaTime, currentSpeed)
    this.updateClouds(deltaTime, currentSpeed)

    if (updateObstacles) {
      this.updateObstacles(deltaTime, currentSpeed)
    }
  }

  /**
  * Update the cloud positions.
  * @param {number} deltaTime
  * @param {number} currentSpeed
  */
  updateClouds(deltaTime, speed) {
    var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed
    var numClouds = this.clouds.length

    if (numClouds) {
      for (var i = numClouds - 1; i >= 0; i--) {
        this.clouds[i].update(cloudSpeed)
      }

      var lastCloud = this.clouds[numClouds - 1]

      // Check for adding a new cloud.
      if (numClouds < this.config.MAX_CLOUDS &&
        (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
        this.cloudFrequency > Math.random()) {
        this.addCloud()
      }

      // Remove expired clouds.
      this.clouds = this.clouds.filter(
        obj => !obj.remove
      )
    }
  }

  /**
  * Update the obstacle positions.
  * @param {number} deltaTime
  * @param {number} currentSpeed
  */
  updateObstacles(deltaTime, currentSpeed) {
    // Obstacles, move to Horizon layer.
    var updatedObstacles = this.obstacles.slice(0);

    for (var i = 0; i < this.obstacles.length; i++) {
      var obstacle = this.obstacles[i];
      obstacle.update(deltaTime, currentSpeed);

      // Clean up existing obstacles.
      if (obstacle.remove) {
        updatedObstacles.shift();
      }
    }

    this.obstacles = updatedObstacles;

    if (this.obstacles.length > 0) {
      var lastObstacle = this.obstacles[this.obstacles.length - 1];

      if (lastObstacle && !lastObstacle.followingObstacleCreated &&
        lastObstacle.isVisible() &&
        (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
        this.dimensions.WIDTH) {
        this.addNewObstacle(currentSpeed);
        lastObstacle.followingObstacleCreated = true;
      }
    } else {
      // Create new obstacles.
      this.addNewObstacle(currentSpeed);
    }
  }

  /**
  * Add a new obstacle.
  * @param {number} currentSpeed
  */
  addNewObstacle(currentSpeed) {
    var obstacleTypeIndex = getRandomNum(0, Obstacle.types.length - 1);
    var obstacleType = Obstacle.types[obstacleTypeIndex];
    var obstacleImg = this.obstacleImgs[obstacleType.type];
    this.obstacles.push(new Obstacle(this.canvasCtx, obstacleType,
      obstacleImg, this.dimensions, this.gapCoefficient, currentSpeed));
  }

  /**
  * Reset the horizon layer.
  * Remove existing obstacles and reposition the horizon line.
  */
  reset() {
    this.obstacles = []
    this.horizonLine.reset()
  }

  /**
  * Update the canvas width and scaling.
  * @param {number} width Canvas width.
  * @param {number} height Canvas height.
  */
  resize(width, height) {
    this.canvas.width = width
    this.canvas.height = height
  }

  /**
  * Add a new cloud to the horizon.
  */
  addCloud() {
    this.clouds.push(new Cloud(this.canvas, this.cloudImg,
      this.dimensions.WIDTH))
  }
}
