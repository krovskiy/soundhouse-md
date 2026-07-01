import './style.css' 
import nexusImg from './images/nexus.png'

document.querySelector('#app').innerHTML = /*html*/`
  <main>
    <nav class="banner-bar">
      <div class="banner-body">
        <img class="banner-img" src="">
        <p class="banner-text">NEW MEMBER: TEST</p>
        <img class="banner-img" src="">
      </div>
    </nav>

    <div class="vst-interface-container">
      <div class="vst-interface-wrapper">
        <img class="vst-interface-layer" src="${nexusImg}">
        <div class="interact-menu">
          <div class="category-bar">
            <h2>category</h2>
            <h2>preset</h2>
            <h2>cat</h2>
          </div>
          <div class="menu-selection-grid">
            <div class="menu-selection-left">
            </div>
            
            <div class="menu-selection-right">
            </div>
            
          </div>
        </div>
      </div>
      <img class="vst-interface-noisestatic-layer">
    </div>

    <div class="members-container">
    <h2 class="members-header">MEMBERS</h2>
      <div class="members-grid">
        <div class="member-card">
          <div class="member-img-placeholder"></div>
          <p class="member-name">MEMBER 01</p>
        </div>
        <div class="member-card">
          <div class="member-img-placeholder"></div>
          <p class="member-name">MEMBER 02</p>
        </div>
        <div class="member-card">
          <div class="member-img-placeholder"></div>
          <p class="member-name">MEMBER 03</p>
        </div>
        <div class="member-card">
          <div class="member-img-placeholder"></div>
          <p class="member-name">MEMBER 04</p>
        </div>
      </div>
    </div>

    <div class="music-container">
      <div class="track-list">
        <div class="track-item">
          <span class="track-num">01</span>
          <span class="track-title">TRACK TITLE</span>
          <span class="track-duration">3:42</span>
        </div>
        <div class="track-item">
          <span class="track-num">02</span>
          <span class="track-title">TRACK TITLE</span>
          <span class="track-duration">4:11</span>
        </div>
        <div class="track-item">
          <span class="track-num">03</span>
          <span class="track-title">TRACK TITLE</span>
          <span class="track-duration">2:58</span>
        </div>
        <div class="track-item">
          <span class="track-num">04</span>
          <span class="track-title">TRACK TITLE</span>
          <span class="track-duration">5:03</span>
        </div>
      </div>
    </div>

    <div class="services-container">
      <div class="services-grid">
        <div class="service-card">
          <h3 class="service-title">MIXING</h3>
          <p class="service-desc">Placeholder description for mixing services.</p>
          <span class="service-price">$--</span>
        </div>
        <div class="service-card">
          <h3 class="service-title">MASTERING</h3>
          <p class="service-desc">Placeholder description for mastering services.</p>
          <span class="service-price">$--</span>
        </div>
        <div class="service-card">
          <h3 class="service-title">PRODUCTION</h3>
          <p class="service-desc">Placeholder description for production services.</p>
          <span class="service-price">$--</span>
        </div>
      </div>
    </div>

    <div class="merch-container">
      <div class="merch-grid">
        <div class="merch-item">
          <div class="merch-img-placeholder"></div>
          <p class="merch-name">ITEM NAME</p>
          <span class="merch-price">$--</span>
        </div>
        <div class="merch-item">
          <div class="merch-img-placeholder"></div>
          <p class="merch-name">ITEM NAME</p>
          <span class="merch-price">$--</span>
        </div>
        <div class="merch-item">
          <div class="merch-img-placeholder"></div>
          <p class="merch-name">ITEM NAME</p>
          <span class="merch-price">$--</span>
        </div>
        <div class="merch-item">
          <div class="merch-img-placeholder"></div>
          <p class="merch-name">ITEM NAME</p>
          <span class="merch-price">$--</span>
        </div>
      </div>
    </div>

  </main>
`