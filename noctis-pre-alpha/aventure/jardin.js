import {enterStage} from './progression.js';

if (enterStage('jardin')) {
  const arrival = document.createElement('p');
  arrival.setAttribute('role', 'status');
  arrival.style.cssText = 'position:fixed;z-index:5;left:50%;bottom:15%;width:max-content;max-width:85vw;transform:translateX(-50%);padding:.75rem 1rem;background:#101a22e8;color:#fff;font:500 1rem/1.5 system-ui;text-align:center;pointer-events:none';
  arrival.textContent = 'ORBI-7 · On reçoit encore leur signal. Il traverse le jardin.';
  document.body.append(arrival);
  setTimeout(() => arrival.remove(), 6500);
}
