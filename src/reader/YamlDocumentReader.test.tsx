import { render, screen, waitFor, within } from '@testing-library/react';

import { YamlDocumentReader } from './YamlDocumentReader';

describe('YamlDocumentReader', () => {
  it('renders parsed YAML with a structured editor surface', async () => {
    render(
      <YamlDocumentReader
        source={'users:\n  - id: 1\n    name: Ada\nmeta:\n  total: 1\n'}
        fileName="config.yaml"
        theme="light"
      />,
    );

    expect(screen.getByRole('heading', { name: 'config.yaml' })).toBeInTheDocument();
    expect(screen.getByText('Object')).toBeInTheDocument();
    expect(screen.getByText('节点 7')).toBeInTheDocument();
    expect(await screen.findByLabelText('YAML 编辑器')).toBeInTheDocument();
  });

  it('shows parse errors and still opens the editor in text mode', async () => {
    render(
      <YamlDocumentReader
        source={'users:\n  - id: 1\n    name: Ada\n  broken\n'}
        fileName="broken.yaml"
        theme="light"
      />,
    );

    expect(screen.getByText(/YAML 解析失败/)).toBeInTheDocument();
    const editor = await screen.findByLabelText('YAML 编辑器');
    await waitFor(() => expect(within(editor).getByText('text')).toBeInTheDocument());
  });
});
