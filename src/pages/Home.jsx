import React from 'react';
import Hero from '../components/Hero';
import ValueProposition from '../components/ValueProposition';
import AboutMe from '../components/AboutMe';
import Quote from '../components/Quote';
import Projects from '../components/Projects';

const Home = () => {
  return (
    <>
      <Hero />
      <ValueProposition />
      <AboutMe />
      <Quote />
      <Projects />
    </>
  );
};

export default Home;
