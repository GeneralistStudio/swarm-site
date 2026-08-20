import { useState } from 'react';
import './PanelFooter.css';

// Shared by AboutPanel and SwarmPanel — both end on the same "enjoy the
// outdoors" pitch + email capture + wordmark, so it lives in one place.
export default function PanelFooter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // placeholder — wire to real email capture backend later
    setSubmitted(true);
  }

  return (
    <div className="panel-footer">
      <h3 className="panel-footer__headline">
        Enjoy the outdoors.
        <br />
        Be free from fear.
      </h3>

      <form className="panel-footer__email" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder="Email Sign Up"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">{submitted ? 'Added' : 'Submit'}</button>
      </form>

      <p className="panel-footer__logo">
        swarm<sup className="panel-footer__reg">®</sup>
      </p>
    </div>
  );
}
