import { base_url } from '../config/api_links';

import Table from '@material-ui/core/Table';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import Button from '@material-ui/core/Button';

function Row(props) {
  const { row, onDownloadFile, score } = props;

  return (
    <>
      <TableRow>
        <TableCell>{row.id}</TableCell>
        <TableCell>{row.docName}</TableCell>
        { score ? <TableCell>{row.score}</TableCell> : '' }
        <TableCell align='right'>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => onDownloadFile(row)}
          >
            Baixar
          </Button>
          {' '}
          <Button 
            variant="contained" 
            color="default"
            component='a'
            href={`${base_url}/files/${row.corpus_uuid}/${row.filename}`}
            target='_blanck'
          >
            Visualizar
          </Button>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function DocsTable(props) {
  const { rows = [], onDownloadFile, corpus_uuid, score = false } = props;

  return (
    <TableContainer>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Doc Id</TableCell>
          <TableCell>Nome do Documento</TableCell>
          { score ? <TableCell>Score</TableCell> : '' }
          <TableCell align='right'>Ações</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <Row key={row.id} row={{ ...row, corpus_uuid }} score={score} onDownloadFile={onDownloadFile}/>
        ))}
      </TableBody>
    </Table>
    </TableContainer>
  );
}