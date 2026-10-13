import { useState } from 'react';
import Wordmark from '../components/brand/Wordmark';
import './PageFooter.css';

// Shared by every page — each ends on the same "enjoy the outdoors" pitch +
// email capture + big wordmark, so it lives in one place. (PageFooter.css)
export default function PageFooter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // placeholder — wire to real email capture backend later
    setSubmitted(true);
  }

  return (
    <div className="page-footer">
      <h3 className="page-footer__headline">
        Enjoy the outdoors.
        <br />
        Be free from fear.
      </h3>

      <form className="page-footer__email" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder="Email Sign Up"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">{submitted ? 'Added' : 'Submit'}</button>
      </form>

      <p className="page-footer__logo">
        <Wordmark />
      </p>
    </div>
  );
}
