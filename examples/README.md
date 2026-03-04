# 🧬 PGA Examples

This directory contains examples demonstrating different aspects of PGA integration.

## 📚 Available Examples

### 1. **basic-usage.ts** — Complete Integration Example

Full example showing:
- PGA initialization
- Genome creation
- **Welcome message** (agent announcement)
- Layer configuration
- Chat interactions
- Feedback recording
- Analytics viewing

**Run:**
```bash
npx tsx examples/basic-usage.ts
```

### 2. **welcome-messages.ts** — Welcome Message Styles

Demonstrates all 4 welcome message styles:
- 📱 **SHORT**: Quick announcement (~50 words)
- 📋 **DETAILED**: Full explanation (~150 words) — Default
- ⚙️ **TECHNICAL**: Developer-oriented (~200 words)
- 😊 **CASUAL**: Friendly and conversational (~120 words)

**Run:**
```bash
npx tsx examples/welcome-messages.ts
```

---

## 🎯 Welcome Message Integration

When a user installs PGA in their agent, the agent should announce its new capabilities using `getWelcomeMessage()`:

### Quick Integration

```typescript
import { PGA } from '@pga-ai/core';

const pga = new PGA({ /* config */ });
const genome = await pga.createGenome({ name: 'my-agent' });

// Agent announces PGA integration
const announcement = genome.getWelcomeMessage('detailed');
console.log(announcement);

// Or send via chat
await sendMessage(announcement);

// Or speak it (TTS)
await speak(announcement);
```

### Choose Your Style

```typescript
// For mobile apps or chatbots
const short = genome.getWelcomeMessage('short');

// For onboarding flows (RECOMMENDED)
const detailed = genome.getWelcomeMessage('detailed');

// For developer tools
const technical = genome.getWelcomeMessage('technical');

// For consumer apps
const casual = genome.getWelcomeMessage('casual');
```

---

## 🚀 Use Cases

### 1. **Chatbot First Message**

```typescript
async function initializeBot(userId: string) {
    const genome = await pga.loadGenome('my-bot');

    // Check if this is user's first interaction
    const dna = await genome.getDNA(userId);

    if (dna.generation === 0) {
        // First time user - send welcome
        const welcome = genome.getWelcomeMessage('casual');
        await sendMessage(userId, welcome);
    }
}
```

### 2. **Voice Assistant Announcement**

```typescript
async function onPGAInstalled() {
    const genome = await pga.createGenome({ name: 'voice-assistant' });

    // Get welcome message
    const announcement = genome.getWelcomeMessage('short');

    // Convert to speech
    await textToSpeech(announcement);

    // Display on screen
    await showNotification({
        title: '🧬 New Capability Unlocked!',
        body: announcement,
    });
}
```

### 3. **Web App Onboarding Modal**

```typescript
function OnboardingModal() {
    const [genome, setGenome] = useState(null);

    useEffect(() => {
        async function init() {
            const g = await pga.createGenome({ name: 'web-agent' });
            setGenome(g);
        }
        init();
    }, []);

    return (
        <Modal title="🧬 Your Agent Just Got Smarter!">
            <div>
                {genome?.getWelcomeMessage('detailed')}
            </div>
            <Button>Let's Get Started!</Button>
        </Modal>
    );
}
```

### 4. **CLI Tool First Run**

```typescript
#!/usr/bin/env node

async function firstRun() {
    const genome = await pga.createGenome({ name: 'cli-tool' });

    console.log(chalk.cyan(genome.getWelcomeMessage('technical')));

    // Continue with CLI initialization...
}
```

---

## 🎨 Customizing Messages

You can also create your own custom welcome message:

```typescript
function getCustomWelcome(genome: GenomeInstance): string {
    return `
🧬 ${genome.name} is now PGA-powered!

Configuration:
- Mutation Rate: ${genome.config.mutationRate}
- Sandbox: ${genome.config.enableSandbox ? 'ON' : 'OFF'}
- Epsilon: ${genome.config.epsilonExplore || 0.1}

I'm ready to learn and evolve with you!
    `.trim();
}
```

---

## 📖 More Resources

- [PGA Documentation](https://docs.pga.ai)
- [API Reference](https://docs.pga.ai/api)
- [Best Practices](https://docs.pga.ai/guides/best-practices)

---

## 💡 Tips

1. **Show the welcome message on first run only** — Don't spam users every time
2. **Match your app's tone** — Use the style that fits your brand
3. **Make it dismissable** — Let users skip if they want
4. **Track engagement** — See if users read/understand the message
5. **A/B test different styles** — Find what resonates with your audience

---

**Happy Evolving!** 🧬✨
