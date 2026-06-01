import React from 'react';
import { MessageCircle, Code2, Zap, Star, ArrowRight, Github } from 'lucide-react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Container } from '../components/Container';
import { Card } from '../components/Card';

export const Landing: React.FC = () => {
  const whatsappNumber = '+6282128383086';
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <section className="neo-section" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="neo-bg-dots" style={{ position: 'absolute', inset: 0, opacity: 0.1 }} />
        <Container>
          <div style={{ display: 'grid', gap: '3rem', alignItems: 'center' }}>
            {/* Left: Content */}
            <div style={{ position: 'relative', zIndex: 10 }}>
              <Badge variant="secondary" className="-rotate-2" style={{ marginBottom: '2rem' }}>
                <Star style={{ width: '1rem', height: '1rem', fill: 'black' }} />
                WhatsApp Automation
              </Badge>
              
              <h1 style={{ 
                fontSize: 'clamp(3rem, 8vw, 6rem)', 
                fontWeight: 900, 
                lineHeight: 0.9,
                marginBottom: '2rem',
                letterSpacing: '-0.02em'
              }}>
                <span style={{ display: 'block' }}>BUILD</span>
                <span style={{ display: 'block', color: 'var(--neo-accent)' }} className="rotate-1">COMMANDS</span>
                <span style={{ display: 'block' }}>FOR WHATSAPP</span>
              </h1>

              <p style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                marginBottom: '3rem',
                maxWidth: '600px',
                lineHeight: 1.4
              }}>
                Community marketplace for WhatsApp automation. Install commands via chat. Build your own with TypeScript.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <Button 
                  size="large" 
                  asLink 
                  href={whatsappLink}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <MessageCircle style={{ width: '1.5rem', height: '1.5rem' }} />
                  START ON WHATSAPP
                </Button>
                
                <Button 
                  variant="secondary" 
                  size="large" 
                  asLink 
                  href="/developer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Code2 style={{ width: '1.5rem', height: '1.5rem' }} />
                  DEVELOPER PORTAL
                </Button>
              </div>

              <p style={{ 
                fontSize: '0.875rem', 
                fontWeight: 700,
                opacity: 0.7,
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Or contact: {whatsappNumber}
              </p>
            </div>
          </div>
        </Container>

        {/* Floating decorative elements */}
        <div style={{ position: 'absolute', top: '10%', right: '5%', zIndex: 1 }}>
          <div className="neo-badge rotate-3 animate-spin-slow" style={{ 
            width: '120px', 
            height: '120px',
            fontSize: '3rem'
          }}>
            ⚡
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="neo-section" style={{ backgroundColor: 'var(--neo-muted)' }}>
        <Container>
          <h2 style={{ 
            fontSize: 'clamp(2rem, 5vw, 4rem)', 
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: '4rem',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em'
          }}>
            HOW IT WORKS
          </h2>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            <Card hover={false} className="-rotate-1">
              <div className="neo-icon" style={{ marginBottom: '1.5rem' }}>
                <MessageCircle />
              </div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 900,
                marginBottom: '1rem',
                textTransform: 'uppercase'
              }}>
                FOR USERS
              </h3>
              <p style={{ fontSize: '1.125rem', lineHeight: 1.6 }}>
                Send <code style={{ 
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'var(--neo-secondary)',
                  border: 'var(--border-2)',
                  fontWeight: 900
                }}>.marketplace</code> to browse commands. Install what you need. Run them instantly.
              </p>
            </Card>

            <Card hover={false} className="rotate-1">
              <div className="neo-icon" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--neo-secondary)' }}>
                <Code2 />
              </div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 900,
                marginBottom: '1rem',
                textTransform: 'uppercase'
              }}>
                FOR DEVELOPERS
              </h3>
              <p style={{ fontSize: '1.125rem', lineHeight: 1.6 }}>
                Build commands with TypeScript SDK. Publish via GitHub. Reach users through the marketplace.
              </p>
            </Card>

            <Card hover={false} className="-rotate-1">
              <div className="neo-icon" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--neo-accent)' }}>
                <Zap />
              </div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 900,
                marginBottom: '1rem',
                textTransform: 'uppercase'
              }}>
                POWERFUL SDK
              </h3>
              <p style={{ fontSize: '1.125rem', lineHeight: 1.6 }}>
                HTTP requests, scheduling, reactions, and more. Everything you need to build rich automations.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="neo-section" style={{ backgroundColor: 'var(--neo-fg)', color: 'var(--neo-white)' }}>
        <Container>
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: 'clamp(2.5rem, 6vw, 5rem)', 
              fontWeight: 900,
              marginBottom: '2rem',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em'
            }}>
              READY TO START?
            </h2>
            
            <p style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700,
              marginBottom: '3rem',
              lineHeight: 1.4
            }}>
              Join the community. Install commands. Build your own.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <Button 
                size="large" 
                asLink 
                href={whatsappLink}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <MessageCircle style={{ width: '1.5rem', height: '1.5rem' }} />
                GET STARTED
                <ArrowRight style={{ width: '1.5rem', height: '1.5rem' }} />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '2rem 0',
        borderTop: 'var(--border-4)',
        backgroundColor: 'var(--neo-secondary)'
      }}>
        <Container>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <p style={{ 
              fontSize: '1rem', 
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              AKKA © 2026
            </p>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <a 
                href="https://github.com/snailsquid/akka-sdk" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--neo-fg)',
                  textDecoration: 'none',
                  fontWeight: 900,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                <Github style={{ width: '1.25rem', height: '1.25rem' }} />
                SDK
              </a>
              <a 
                href="/developer" 
                style={{ 
                  color: 'var(--neo-fg)',
                  textDecoration: 'none',
                  fontWeight: 900,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                DEVELOPERS
              </a>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
};
