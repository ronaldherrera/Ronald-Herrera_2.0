import React from 'react';
import Hero from '../components/Hero';
import Positioning from '../components/Positioning';
import ValueProposition from '../components/ValueProposition';
import PortfolioTransition from '../components/PortfolioTransition';
import Projects from '../components/Projects';
import AboutMe from '../components/AboutMe';
import FinalCTA from '../components/FinalCTA';

const Home = () => {
  return (
    <>
      <Hero />
      <Positioning />
      <ValueProposition />
      <PortfolioTransition />
      <Projects />
      <AboutMe />
      <FinalCTA />
    </>
  );
};

export default Home;
