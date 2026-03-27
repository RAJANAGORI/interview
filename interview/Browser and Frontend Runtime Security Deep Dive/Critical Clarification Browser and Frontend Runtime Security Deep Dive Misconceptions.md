# Critical Clarification Browser and Frontend Runtime Security Deep Dive Misconceptions

- "Using React/Vue automatically prevents XSS."  
  Unsafe sinks and third-party scripts still create risk.

- "CSP can be added later."  
  Retrofitting CSP is expensive without early architecture choices.

- "HttpOnly cookies remove frontend risk."  
  They help with token theft but do not stop all browser-side attacks.
