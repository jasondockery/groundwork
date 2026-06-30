return {
  {
    "christoomey/vim-tmux-navigator",
    init = function()
      vim.g.tmux_navigator_no_mappings = 1
      vim.g.tmux_navigator_disable_netrw_workaround = 1
    end,
    keys = {
      { "<M-h>", "<cmd><C-U>TmuxNavigateLeft<cr>", desc = "Move left" },
      { "<M-j>", "<cmd><C-U>TmuxNavigateDown<cr>", desc = "Move down" },
      { "<M-k>", "<cmd><C-U>TmuxNavigateUp<cr>", desc = "Move up" },
      { "<M-l>", "<cmd><C-U>TmuxNavigateRight<cr>", desc = "Move right" },
      { "<M-h>", "<C-w>:<C-U>TmuxNavigateLeft<cr>", desc = "Move left", mode = "t" },
      { "<M-j>", "<C-w>:<C-U>TmuxNavigateDown<cr>", desc = "Move down", mode = "t" },
      { "<M-k>", "<C-w>:<C-U>TmuxNavigateUp<cr>", desc = "Move up", mode = "t" },
      { "<M-l>", "<C-w>:<C-U>TmuxNavigateRight<cr>", desc = "Move right", mode = "t" },
    },
  },
}
