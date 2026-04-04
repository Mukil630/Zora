const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const executor = require('../services/executor');

// GET all agents for logged in user
router.get('/', auth, async (req, res) => {
  const supabase = req.app.get('supabase');
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ agents: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new agent
router.post('/', auth, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { name, type, credentials } = req.body;

  try {
    const { data, error } = await supabase
      .from('agents')
      .insert([{
        user_id: req.user.id,
        name,
        type,
        credentials
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ message: '✅ Agent created!', agent: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RUN agent
router.post('/:id/run', auth, async (req, res) => {
  const supabase = req.app.get('supabase');
  const { input } = req.body;

  try {
    // Get agent
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !agent) {
      return res.status(404).json({ error: '❌ Agent not found!' });
    }

    // Run the agent
    const result = await executor.run(agent, input);

    // Save log
    await supabase.from('run_logs').insert([{
      agent_id: agent.id,
      user_id: req.user.id,
      status: 'success',
      input,
      output: result
    }]);

    // Update run count
    await supabase
      .from('agents')
      .update({ run_count: agent.run_count + 1, last_run: new Date() })
      .eq('id', agent.id);

    res.json({ message: '✅ Agent ran successfully!', result });
  } catch (err) {
    // Save failed log
    const supabase = req.app.get('supabase');
    await supabase.from('run_logs').insert([{
      agent_id: req.params.id,
      user_id: req.user.id,
      status: 'failed',
      input,
      output: err.message
    }]);
    res.status(500).json({ error: err.message });
  }
});

// DELETE agent
router.delete('/:id', auth, async (req, res) => {
  const supabase = req.app.get('supabase');
  try {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: '✅ Agent deleted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;