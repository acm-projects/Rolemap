import React from 'react';
import Image from 'next/image';
// import target from 'frontend/app/target.png'
// import thunder from 'frontend/app/blue-thunder.png'
// import trophy from 'frontend/app/trophy.png'

const Landing: React.FC = () => {
  return (
    <div className='landing'>
      <div className='navbar'>
        <button className='login-button'>Login</button>
      </div>
      <div className='hero'>
        <h1 className='heading'>Rolemap</h1>
        <p className='subheading'>Master Any Tech Role</p>
        <span className='span-subheading'>With AI Guidance</span>
        <p className='description'>Get a personalized learning roadmap tailored to your background and goals. Track progress, complete daily challenges, and level up your career.</p>
        <div className='features'>
          <div className='card'>
            <h3>Personalized Roadmaps</h3>
            <p>AI analyzes your resume and GitHub to create a custom learning path</p>
          </div>
          <div className='card'>
            <h3>Daily Challenges</h3>
            <p>Bite-sized tasks that build real skills through consistent practice</p>
          </div>
          <div className='card'>
            <h3>Gamified Progress</h3>
            <p>Earn XP, maintain streaks, and compete on global leaderboards</p>
          </div>
          {/* <div>
            <Image src={target} alt="Logo" width={200} height={200} />
          </div> */}
        </div>
      </div>
      <div className='but'>
      <button className='signup-button'>Sign Up</button>
      </div>
    </div>
  );
}

export default Landing;
