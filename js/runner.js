/**
* T-Rex runner.
* @param {string} outerContainerId Outer containing element id.
* @param {object} opt_config
* @constructor
* @export
*/
class Runner {
  constructor(outerContainerId, opt_config) {
    // Singleton
    if (Runner.instance) {
      return Runner.instance
    }
    Runner.instance = this

    this.outerContainerEl = document.querySelector(outerContainerId)
    this.containerEl = null
    this.detailsButton = this.outerContainerEl.querySelector('#details-button')
    this.config = opt_config || Runner.config
    this.dimensions = Runner.defaultDimensions
    this.canvas = null
    this.canvasCtx = null
    this.tRex = null
    this.distanceMeter = null
    this.distanceRan = 0
    this.highestScore = 0
    this.time = 0
    this.runningTime = 0
    this.msPerFrame = 1000 / FPS
    this.currentSpeed = this.config.SPEED
    this.obstacles = []
    this.started = false
    this.activated = false
    this.crashed = false
    this.paused = false
    this.resizeTimerId_ = null
    this.playCount = 0

    // Sound FX.
    this.audioBuffer = null
    this.soundFx = {}

    // Global web audio context for playing sounds.
    this.audioContext = null

    // Images.
    this.images = {}
    this.imagesLoaded = 0
    this.loadImages()
  }

  /**
  * Default game configuration.
  * @enum {number}
  */
  static get config() {
    return {
      ACCELERATION: 0.001,
      BG_CLOUD_SPEED: 0.2,
      BOTTOM_PAD: 10,
      CLEAR_TIME: 3000,
      CLOUD_FREQUENCY: 0.5,
      GAMEOVER_CLEAR_TIME: 750,
      GAP_COEFFICIENT: 0.6,
      GRAVITY: 0.6,
      INITIAL_JUMP_VELOCITY: 12,
      MAX_CLOUDS: 6,
      MAX_OBSTACLE_LENGTH: 3,
      MAX_SPEED: 12,
      MIN_JUMP_HEIGHT: 35,
      MOBILE_SPEED_COEFFICIENT: 1.2,
      RESOURCE_TEMPLATE_ID: 'audio-resources',
      SPEED: 6,
      SPEED_DROP_COEFFICIENT: 3
    }
  }

  /**
  * Default dimensions.
  * @enum {string}
  */
  static get defaultDimensions() {
    return {
      WIDTH: DEFAULT_WIDTH,
      HEIGHT: 150
    }
  }

  /**
  * CSS class names.
  * @enum {string}
  */
  static get classes() {
    return {
      CANVAS: 'runner-canvas',
      CONTAINER: 'runner-container',
      CRASHED: 'crashed',
      ICON: 'icon-offline',
      TOUCH_CONTROLLER: 'controller'
    }
  }

  /**
  * Image source urls.
  * @enum {array.<object>}
  */
  static get imageSources() {
    return {
      LDPI: [
        { name: 'CACTUS_LARGE', id: '1x-obstacle-large' },
        { name: 'CACTUS_SMALL', id: '1x-obstacle-small' },
        { name: 'CLOUD', id: '1x-cloud' },
        { name: 'HORIZON', id: '1x-horizon' },
        { name: 'RESTART', id: '1x-restart' },
        { name: 'TEXT_SPRITE', id: '1x-text' },
        { name: 'TREX', id: '1x-trex' }
      ],
      HDPI: [
        { name: 'CACTUS_LARGE', id: '2x-obstacle-large' },
        { name: 'CACTUS_SMALL', id: '2x-obstacle-small' },
        { name: 'CLOUD', id: '2x-cloud' },
        { name: 'HORIZON', id: '2x-horizon' },
        { name: 'RESTART', id: '2x-restart' },
        { name: 'TEXT_SPRITE', id: '2x-text' },
        { name: 'TREX', id: '2x-trex' }
      ]
    }
  }

  /**
  * Sound FX. Reference to the ID of the audio tag on interstitial page.
  * @enum {string}
  */
  static get sounds() {
    return {
      BUTTON_PRESS: 'offline-sound-press',
      HIT: 'offline-sound-hit',
      SCORE: 'offline-sound-reached'
    }
  }

  /**
  * Key code mapping.
  * @enum {object}
  */
  static get keycodes() {
    return {
      JUMP: { '38': 1, '32': 1 }, // Up, spacebar
      DUCK: { '40': 1 }, // Down
      RESTART: { '13': 1 } // Enter
    }
  }

  /**
  * Runner event names.
  * @enum {string}
  */
  static get events() {
    return {
      ANIM_END: 'webkitAnimationEnd',
      CLICK: 'click',
      KEYDOWN: 'keydown',
      KEYUP: 'keyup',
      MOUSEDOWN: 'mousedown',
      MOUSEUP: 'mouseup',
      RESIZE: 'resize',
      TOUCHEND: 'touchend',
      TOUCHSTART: 'touchstart',
      VISIBILITY: 'visibilitychange',
      BLUR: 'blur',
      FOCUS: 'focus',
      LOAD: 'load'
    }
  }

  /**
  * Setting individual settings for debugging.
  * @param {string} setting
  * @param {*} value
  */
  updateConfigSetting(setting, value) {
    if (setting in this.config && value != undefined) {
      this.config[setting] = value
      switch (setting) {
        case 'GRAVITY':
        case 'MIN_JUMP_HEIGHT':
        case 'SPEED_DROP_COEFFICIENT':
          this.tRex.config[setting] = value
          break
        case 'INITIAL_JUMP_VELOCITY':
          this.tRex.setJumpVelocity(value)
          break
        case 'SPEED':
          this.setSpeed(value)
          break
      }
    }
  }

  /**
  * Load and cache the image assets from the page.
  */
  loadImages() {
    let imageSources = IS_HIDPI ? Runner.imageSources.HDPI :
      Runner.imageSources.LDPI
    let numImages = imageSources.length

    for (let i = numImages - 1; i >= 0; i--) {
      let imgSource = imageSources[i]
      this.images[imgSource.name] = document.getElementById(imgSource.id)
    }
    
    this.init()
  }

  /**
  * Load and decode base 64 encoded sounds.
  */
  loadSounds() {
    if (!IS_IOS) {
      this.audioContext = new AudioContext()
      let resourceTemplate = document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content

      for (let sound in Runner.sounds) {
        let soundSrc = resourceTemplate.getElementById(Runner.sounds[sound]).src
        soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1)

        let buffer = decodeBase64ToArrayBuffer(soundSrc)

        // Async, so no guarantee of order in array.
        this.audioContext.decodeAudioData(
          buffer,
          (index, audioData) => this.soundFx[index] = audioData
        )
      }
    }
  }

  /**
  * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
  * @param {number} opt_speed
  */
  setSpeed(opt_speed) {
    let speed = opt_speed || this.currentSpeed

    // Reduce the speed on smaller mobile screens.
    if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
      let mobileSpeed = speed * this.dimensions.WIDTH / DEFAULT_WIDTH * this.config.MOBILE_SPEED_COEFFICIENT
      this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed
    } else if (opt_speed) {
      this.currentSpeed = opt_speed
    }
  }

  /**
   * Game initialiser.
   */
  init() {
    this.adjustDimensions()
    this.setSpeed()
    this.containerEl = document.createElement('div')
    this.containerEl.className = Runner.classes.CONTAINER

    // Player canvas container.
    this.canvas = createCanvas(
      this.containerEl,
      this.dimensions.WIDTH,
      this.dimensions.HEIGHT,
      Runner.classes.PLAYER)
    this.canvasCtx = this.canvas.getContext('2d')
    this.canvasCtx.fillStyle = '#f7f7f7'
    this.canvasCtx.fill()
    Runner.updateCanvasScaling(this.canvas)

    // Horizon contains clouds, obstacles and the ground.
    this.horizon = new Horizon(
      this.canvas,
      this.images,
      this.dimensions,
      this.config.GAP_COEFFICIENT)

    // Distance meter
    this.distanceMeter = new DistanceMeter(
      this.canvas,
      this.images.TEXT_SPRITE,
      this.dimensions.WIDTH)

    // Draw t-rex
    this.tRex = new Trex(this.canvas, this.images.TREX)
    this.outerContainerEl.appendChild(this.containerEl)
    if (IS_MOBILE) {
      this.createTouchController()
    }
    this.startListening()
    this.update()
    window.addEventListener(Runner.events.RESIZE,
      this.debounceResize.bind(this))
  }

  /**
  * Create the touch controller. A div that covers whole screen.
  */
  createTouchController() {
    this.touchController = document.createElement('div')
    this.touchController.className = Runner.classes.TOUCH_CONTROLLER
  }

  /**
  * Debounce the resize event.
  */
  debounceResize() {
    if (!this.resizeTimerId_) {
      this.resizeTimerId_ =
        setInterval(this.adjustDimensions.bind(this), 250)
    }
  }

  /**
  * Adjust game space dimensions on resize.
  */
  adjustDimensions() {
    clearInterval(this.resizeTimerId_)
    this.resizeTimerId_ = null
    let boxStyles = window.getComputedStyle(this.outerContainerEl)
    let padding = Number(boxStyles.paddingLeft.substr(0,
      boxStyles.paddingLeft.length - 2))
    this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2

    // Redraw the elements back onto the canvas.
    if (this.canvas) {
      this.canvas.width = this.dimensions.WIDTH
      this.canvas.height = this.dimensions.HEIGHT
      Runner.updateCanvasScaling(this.canvas)
      this.distanceMeter.calcXPos(this.dimensions.WIDTH)
      this.clearCanvas()
      this.horizon.update(0, 0, true)
      this.tRex.update(0)

      // Outer container and distance meter.
      if (this.activated || this.crashed) {
        this.containerEl.style.width = this.dimensions.WIDTH + 'px'
        this.containerEl.style.height = this.dimensions.HEIGHT + 'px'
        this.distanceMeter.update(0, Math.ceil(this.distanceRan))
        this.stop()
      } else {
        this.tRex.draw(0, 0)
      }

      // Game over panel.
      if (this.crashed && this.gameOverPanel) {
        this.gameOverPanel.updateDimensions(this.dimensions.WIDTH)
        this.gameOverPanel.draw()
      }
    }
  }

  /**
  * Play the game intro.
  * Canvas container width expands out to the full width.
  */
  playIntro() {
    if (!this.started && !this.crashed) {
      this.playingIntro = true
      this.tRex.playingIntro = true

      // CSS animation definition.
      let keyframes = `@-webkit-keyframes intro {
        from { width: ${Trex.config.WIDTH} px }
        to { width: ${this.dimensions.WIDTH} px }
      }`

      document.styleSheets[0].insertRule(keyframes, 0)
      this.containerEl.addEventListener(
        Runner.events.ANIM_END,
        this.startGame.bind(this))
      this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both'
      this.containerEl.style.width = this.dimensions.WIDTH + 'px'

      if (this.touchController) {
        this.outerContainerEl.appendChild(this.touchController)
      }

      this.activated = true
      this.started = true
    } else if (this.crashed) {
      this.restart()
    }
  }

  /**
  * Update the game status to started.
  */
  startGame() {
    this.runningTime = 0
    this.playingIntro = false
    this.tRex.playingIntro = false
    this.containerEl.style.webkitAnimation = ''
    this.playCount++

    // Handle tabbing off the page. Pause the current game.
    window.addEventListener(Runner.events.VISIBILITY,
      this.onVisibilityChange.bind(this))
    window.addEventListener(Runner.events.BLUR,
      this.onVisibilityChange.bind(this))
    window.addEventListener(Runner.events.FOCUS,
      this.onVisibilityChange.bind(this))
  }

  clearCanvas() {
    this.canvasCtx.clearRect(0, 0, this.dimensions.WIDTH,
      this.dimensions.HEIGHT)
  }

  /**
  * Update the game frame.
  */
  update() {
    this.drawPending = false
    let now = getTimeStamp()
    let deltaTime = now - (this.time || now)
    this.time = now

    if (this.activated) {
      this.clearCanvas()

      if (this.tRex.jumping) {
        this.tRex.updateJump(deltaTime, this.config)
      }

      this.runningTime += deltaTime
      let hasObstacles = this.runningTime > this.config.CLEAR_TIME

      // First jump triggers the intro.
      if (this.tRex.jumpCount == 1 && !this.playingIntro) {
        this.playIntro()
      }

      // The horizon doesn't move until the intro is over.
      if (this.playingIntro) {
        this.horizon.update(0, this.currentSpeed, hasObstacles)
      } else {
        deltaTime = !this.started ? 0 : deltaTime
        this.horizon.update(deltaTime, this.currentSpeed, hasObstacles)
      }

      // Check for collisions.
      let collision = hasObstacles &&
        checkForCollision(this.horizon.obstacles[0], this.tRex)

      if (!collision) {
        this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame

        if (this.currentSpeed < this.config.MAX_SPEED) {
          this.currentSpeed += this.config.ACCELERATION
        }
      } else {
        this.gameOver()
      }

      if (this.distanceMeter.getActualDistance(this.distanceRan) >
        this.distanceMeter.maxScore) {
        this.distanceRan = 0
      }

      let playAcheivementSound = this.distanceMeter.update(deltaTime,
        Math.ceil(this.distanceRan))

      if (playAcheivementSound) {
        this.playSound(this.soundFx.SCORE)
      }
    }

    if (!this.crashed) {
      this.tRex.update(deltaTime)
      this.raq()
    }
  }

  /**
  * Event handler.
  */
  handleEvent(e) {
    return ((evtType, events) => {
      switch (evtType) {
        case events.KEYDOWN:
        case events.TOUCHSTART:
        case events.MOUSEDOWN:
          this.onKeyDown(e)
          break

        case events.KEYUP:
        case events.TOUCHEND:
        case events.MOUSEUP:
          this.onKeyUp(e)
          break
      }
    })(e.type, Runner.events)
  }

  /**
  * Bind relevant key / mouse / touch listeners.
  */
  startListening() {
    // Keys.
    document.addEventListener(Runner.events.KEYDOWN, this)
    document.addEventListener(Runner.events.KEYUP, this)

    if (IS_MOBILE) {
      // Mobile only touch devices.
      this.touchController.addEventListener(Runner.events.TOUCHSTART, this)
      this.touchController.addEventListener(Runner.events.TOUCHEND, this)
      this.containerEl.addEventListener(Runner.events.TOUCHSTART, this)
    } else {
      // Mouse.
      document.addEventListener(Runner.events.MOUSEDOWN, this)
      document.addEventListener(Runner.events.MOUSEUP, this)
    }
  }

  /**
  * Remove all listeners.
  */
  stopListening() {
    document.removeEventListener(Runner.events.KEYDOWN, this)
    document.removeEventListener(Runner.events.KEYUP, this)

    if (IS_MOBILE) {
      this.touchController.removeEventListener(Runner.events.TOUCHSTART, this)
      this.touchController.removeEventListener(Runner.events.TOUCHEND, this)
      this.containerEl.removeEventListener(Runner.events.TOUCHSTART, this)
    } else {
      document.removeEventListener(Runner.events.MOUSEDOWN, this)
      document.removeEventListener(Runner.events.MOUSEUP, this)
    }
  }

  /**
  * Process keydown.
  * @param {Event} e
  */
  onKeyDown(e) {
    if (e.target != this.detailsButton) {
      if (!this.crashed && (Runner.keycodes.JUMP[String(e.keyCode)] ||
        e.type == Runner.events.TOUCHSTART)) {

        if (!this.activated) {
          this.loadSounds()
          this.activated = true
        }

        if (!this.tRex.jumping) {
          this.playSound(this.soundFx.BUTTON_PRESS)
          this.tRex.startJump()
        }
      }

      if (this.crashed && e.type == Runner.events.TOUCHSTART &&
        e.currentTarget == this.containerEl) {
        this.restart()
      }
    }

    // Speed drop, activated only when jump key is not pressed.
    if (Runner.keycodes.DUCK[e.keyCode] && this.tRex.jumping) {
      e.preventDefault()
      this.tRex.setSpeedDrop()
    }
  }

  /**
  * Process key up.
  * @param {Event} e
  */
  onKeyUp(e) {
    let keyCode = String(e.keyCode)
    let isjumpKey = Runner.keycodes.JUMP[keyCode] ||
      e.type == Runner.events.TOUCHEND ||
      e.type == Runner.events.MOUSEDOWN

    if (this.isRunning() && isjumpKey) {
      this.tRex.endJump()
    } else if (Runner.keycodes.DUCK[keyCode]) {
      this.tRex.speedDrop = false
    } else if (this.crashed) {
      // Check that enough time has elapsed before allowing jump key to restart.
      let deltaTime = getTimeStamp() - this.time

      if (Runner.keycodes.RESTART[keyCode] ||
        (e.type == Runner.events.MOUSEUP && e.target == this.canvas) ||
        (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
          Runner.keycodes.JUMP[keyCode])) {
        this.restart()
      }
    } else if (this.paused && isjumpKey) {
      this.play()
    }
  }

  /**
  * RequestAnimationFrame wrapper.
  */
  raq() {
    if (!this.drawPending) {
      this.drawPending = true
      this.raqId = requestAnimationFrame(this.update.bind(this))
    }
  }

  /**
  * Whether the game is running.
  * @return {boolean}
  */
  isRunning() {
    return !!this.raqId
  }

  /**
  * Game over state.
  */
  gameOver() {
    this.playSound(this.soundFx.HIT)
    vibrate(200)
    this.stop()
    this.crashed = true
    this.distanceMeter.acheivement = false
    this.tRex.update(100, Trex.status.CRASHED)

    // Game over panel.
    if (!this.gameOverPanel) {
      this.gameOverPanel = new GameOverPanel(this.canvas,
        this.images.TEXT_SPRITE, this.images.RESTART,
        this.dimensions)
    } else {
      this.gameOverPanel.draw()
    }

    // Update the high score.
    if (this.distanceRan > this.highestScore) {
      this.highestScore = Math.ceil(this.distanceRan)
      this.distanceMeter.setHighScore(this.highestScore)
    }

    // Reset the time clock.
    this.time = getTimeStamp()
  }

  stop() {
    this.activated = false
    this.paused = true
    cancelAnimationFrame(this.raqId)
    this.raqId = 0
  }

  play() {
    if (!this.crashed) {
      this.activated = true
      this.paused = false
      this.tRex.update(0, Trex.status.RUNNING)
      this.time = getTimeStamp()
      this.update()
    }
  }

  restart() {
    if (!this.raqId) {
      this.playCount++
      this.runningTime = 0
      this.activated = true
      this.crashed = false
      this.distanceRan = 0
      this.setSpeed(this.config.SPEED)
      this.time = getTimeStamp()
      this.containerEl.classList.remove(Runner.classes.CRASHED)
      this.clearCanvas()
      this.distanceMeter.reset(this.highestScore)
      this.horizon.reset()
      this.tRex.reset()
      this.playSound(this.soundFx.BUTTON_PRESS)
      this.update()
    }
  }

  /**
  * Pause the game if the tab is not in focus.
  */
  onVisibilityChange(e) {
    if (document.hidden || document.webkitHidden || e.type == 'blur') {
      this.stop()
    } else {
      this.play()
    }
  }

  /**
  * Play a sound.
  * @param {SoundBuffer} soundBuffer
  */
  playSound(soundBuffer) {
    if (soundBuffer) {
      let sourceNode = this.audioContext.createBufferSource()
      sourceNode.buffer = soundBuffer
      sourceNode.connect(this.audioContext.destination)
      sourceNode.start(0)
    }
  }

  /**
  * Updates the canvas size taking into
  * account the backing store pixel ratio and
  * the device pixel ratio.
  *
  * See article by Paul Lewis:
  * https://www.html5rocks.com/en/tutorials/canvas/hidpi/
  *
  * @param {HTMLCanvasElement} canvas
  * @param {number} opt_width
  * @param {number} opt_height
  * @return {boolean} Whether the canvas was scaled.
  */
  static updateCanvasScaling(canvas, opt_width, opt_height) {
    let context = canvas.getContext('2d')

    // Query the letious pixel ratios
    let devicePixelRatio = Math.floor(window.devicePixelRatio) || 1
    let backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1
    let ratio = devicePixelRatio / backingStoreRatio

    // Upscale the canvas if the two ratios don't match
    if (devicePixelRatio !== backingStoreRatio) {
      let oldWidth = opt_width || canvas.width
      let oldHeight = opt_height || canvas.height
      canvas.width = oldWidth * ratio
      canvas.height = oldHeight * ratio
      canvas.style.width = oldWidth + 'px'
      canvas.style.height = oldHeight + 'px'

      // Scale the context to counter the fact that we've manually scaled
      // our canvas element.
      context.scale(ratio, ratio)

      return true
    }

    return false
  }
}
