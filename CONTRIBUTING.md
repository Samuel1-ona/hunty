# Contributing to Hunty

Hey there! 👋 Thanks for wanting to contribute to Hunty. We're excited to have you on board! This guide will help you get started and make your first contribution smooth and enjoyable.

## First Things First

Before diving in, let's make sure you have everything you need to get started. Don't worry if you're new to Soroban or Rust - we've all been there, and we're here to help!

### What You'll Need

- **Rust** - We're using the latest stable version, so make sure yours is up to date
- **Stellar CLI** - You'll need the `stellar` command installed for building contracts
- **Git** - For version control (you probably already have this!)
- **Basic Soroban knowledge** - Don't worry if you're still learning! We have good first issues that are perfect for getting your feet wet

### Getting Your Environment Ready

Let's get your development environment set up. It's pretty straightforward:

1. **Clone the repo:**
   ```bash
   git clone https://github.com/Samuel1-ona/Hunty-contract.git
   cd Hunty-contract
   ```

2. **Build everything:**
   This will compile all three contracts. Grab a coffee ☕ - first builds can take a minute!
   ```bash
   cd contracts/hunty-core && make build
   cd ../reward-manager && make build
   cd ../nft-reward && make build
   ```

3. **Run the tests:**
   Make sure everything works before you start making changes:
   ```bash
   cd contracts/hunty-core && make test
   cd ../reward-manager && make test
   cd ../nft-reward && make test
   ```

If all the tests pass, you're good to go! 🎉

## Understanding the Project Structure

Here's how we've organized things. Don't worry about memorizing this - you'll get familiar with it as you work:

```
hunty-contract/
├── contracts/
│   ├── hunty-core/          # This is where the main game logic lives
│   │   ├── src/
│   │   │   ├── lib.rs       # The heart of the contract - main functions here
│   │   │   ├── types.rs     # All our data structures (Hunt, Clue, etc.)
│   │   │   ├── storage.rs   # How we save and retrieve data
│   │   │   ├── errors.rs    # Custom error types for better error messages
│   │   │   └── test.rs      # Tests go here - write lots of these!
│   │   └── Cargo.toml
│   ├── reward-manager/      # Handles all the reward distribution magic
│   │   ├── src/
│   │   │   ├── lib.rs       # Main reward coordination logic
│   │   │   ├── xlm_handler.rs  # XLM token distribution
│   │   │   ├── nft_handler.rs  # NFT minting coordination
│   │   │   └── test.rs
│   │   └── Cargo.toml
│   └── nft-reward/          # Creates those cool NFT trophies
│       ├── src/
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── Cargo.toml               # Workspace config - don't touch this unless you know what you're doing
└── README.md
```

## Finding Something to Work On

Not sure where to start? That's totally fine! Here are some ways to find the perfect issue for you:

### Check Out Our Issues

Head over to [GitHub Issues](https://github.com/Samuel1-ona/Hunty-contract/issues) and look for labels that match your experience level:

- **good first issue** 🟢 - Perfect if you're new! These are designed to be approachable and help you learn the codebase
- **enhancement** 🟡 - Adding new features or improving existing ones
- **bug** 🔴 - Something's broken and needs fixing
- **documentation** 📝 - Help us explain things better - great for writers!
- **refactor** 🔧 - Making code cleaner and more maintainable

### Still Not Sure?

If you're feeling overwhelmed, start with:
1. Issues labeled "good first issue" - we specifically set these up for newcomers
2. Documentation improvements - these are low-stress and help everyone
3. Test coverage - writing tests is a great way to understand how things work

## Your Development Workflow

Here's the process we follow. It might seem like a lot at first, but it becomes second nature pretty quickly:

### 1. Create a Branch

Always work on a branch - never commit directly to main! This keeps things organized and makes it easy to review your work.

```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/your-bug-fix
```

**Pro tip:** Make your branch name descriptive. `feature/add-multi-answer-support` is way better than `feature/stuff`!

### 2. Make Your Changes

This is the fun part! A few things to keep in mind:

- **Follow existing patterns** - Look at how similar code is written in the project
- **Write tests** - Seriously, write tests. Your future self (and code reviewers) will thank you
- **Update docs** - If you're adding a new feature, make sure the docs reflect it
- **Keep it simple** - The best code is code that's easy to understand

### 3. Test Everything

Before you commit, make sure everything still works:

```bash
make test
```

If tests fail, don't panic! Read the error messages - they're usually pretty helpful. And if you're stuck, ask for help. We've all been there.

### 4. Commit Your Changes

Write a clear commit message that explains what you did and why:

```bash
git add .
git commit -m "Add support for multiple valid answers per clue

This allows hunt creators to accept variations like 'Paris' or 'paris'
as correct answers, making the system more user-friendly."
```

**Good commit messages:**
- Explain what changed
- Explain why (if it's not obvious)
- Are written in present tense ("Add feature" not "Added feature")

### 5. Push and Create a Pull Request

Once you're happy with your changes:

```bash
git push origin feature/your-feature-name
```

Then head over to GitHub and create a pull request. In your PR description, tell us:
- What you changed
- Why you changed it
- How to test it
- Any questions or concerns you have

## Code Style Guidelines

We're not super strict, but consistency helps everyone. Here's what we prefer:

- **Follow Rust conventions** - `cargo fmt` is your friend, use it!
- **Add comments** - Especially for complex logic. we will appreciate it
- **Descriptive names** - `calculate_player_score()` is better than `calc()`
- **Keep functions focused** - If a function does too many things, consider breaking it up

Run `cargo fmt` before committing - it'll format your code automatically. Easy win! ✨

## Testing - It's Important!

We can't stress this enough: **write tests**. They're not just for catching bugs - they're also documentation that shows how your code is supposed to work.

### What to Test

- **Happy paths** - Does it work when everything goes right?
- **Edge cases** - What happens with empty inputs? Invalid data? Boundary conditions?
- **Error conditions** - Does it fail gracefully with helpful error messages?
- **Integration** - If you're calling other contracts, test that interaction

### Our Testing Goals

- Aim for >80% code coverage 
- Test edge cases - these are where bugs hide
- Include integration tests for cross-contract calls
- Make tests readable - they should tell a story

## Submitting Your Pull Request

You've written the code, written the tests, and everything passes. Awesome! Now let's get it reviewed:

### Before You Submit

- ✅ All tests pass (locally and in CI)
- ✅ Documentation is updated (if needed)
- ✅ Code is formatted (`cargo fmt`)
- ✅ You've tested your changes manually (if applicable)

### Writing Your PR Description

A good PR description helps reviewers understand your work quickly:

```markdown
## What This Does
Adds support for multiple valid answers per clue, allowing hunt creators
to accept variations like "Paris", "paris", or "City of Light" as correct.

## Why
Some clues have multiple valid answers, and we want to be flexible while
still maintaining security through hash verification.

## Testing
- Added unit tests for multi-answer verification
- Tested with various answer formats
- Verified backward compatibility with single-answer clues

## Related Issues
Closes #21
```

### The Review Process

Don't take feedback personally! Code reviews are about making the code better, not criticizing you. We're all learning and improving together.



## Contract-Specific Tips

Each contract has its own quirks. Here's what to know:

### HuntyCore Contract

This is the main game logic, so it's pretty important:

- **types.rs** - Define all your data structures here. Keep them organized and well-documented
- **storage.rs** - Storage access patterns. Make sure keys are unique and consistent
- **errors.rs** - Custom errors make debugging way easier. Use them!
- **lib.rs** - Main contract logic. Keep functions focused and testable

### RewardManager Contract

This coordinates rewards, so precision matters:

- Coordinate with both XLM and NFT handlers - they need to work together
- Ensure atomic operations - either everything succeeds or nothing does
- Handle edge cases gracefully - what if a transfer fails? What if the pool is empty?

### NftReward Contract

NFTs are cool, but they need to be done right:

- Follow Stellar NFT standards - this ensures compatibility
- Keep metadata consistent - it's what makes each NFT unique
- Track ownership properly - this is critical for transfers

## Getting Help

Stuck on something? We've got your back:

- **Leave a message on the issue** - I will get back to you as quick as possible 




## License

By contributing to Hunty, you agree that your contributions will be licensed under the same license as the project. This basically means your code becomes part of the open source project.

---

Thanks for reading this far! We're genuinely excited to see what you'll build. Happy coding! 🚀
