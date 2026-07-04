-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

-- Absolute line numbers (LazyVim defaults to hybrid/relative). In an
-- AI-native workflow the numbers in the gutter should match what agents,
-- compilers, and reviewers say: "fix starship.toml:15" is only glanceable
-- when line 15 is labeled 15, not by its distance from the cursor.
vim.opt.number = true
vim.opt.relativenumber = false
