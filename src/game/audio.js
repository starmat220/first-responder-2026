class TacticalAudio {
  constructor() {
    this.ctx = null
    this.enabled = true
  }

  init() {
    if (this.ctx) return
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
  }

  // Tactical "Mic Chirp" sound
  playChirp() {
    if (!this.enabled || !this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    
    osc.type = 'square'
    osc.frequency.setValueAtTime(800, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05)
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05)
    
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    
    osc.start()
    osc.stop(this.ctx.currentTime + 0.05)
  }

  // Emergency Alert Ping
  playAlert(priority = 1) {
    if (!this.enabled || !this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    
    const freq = priority === 1 ? 1200 : 800
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3)
    
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    
    osc.start()
    osc.stop(this.ctx.currentTime + 0.3)
  }

  // Dispatch "Call Received" beeps
  playDispatch() {
    if (!this.enabled || !this.ctx) return
    this.playAlert(2)
    setTimeout(() => this.playAlert(2), 150)
  }
}

export const audio = new TacticalAudio()
