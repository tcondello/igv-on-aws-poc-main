import React, { Component } from 'react';
import { Auth } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import AWS from 'aws-sdk';
import igv from 'igv';
import { Button, Input, Select, Divider, Row, Col, Layout, Table, notification } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import 'antd/dist/antd.css';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {data: [], bucket: 's3-sample-genomics-data-igv'};
    this.columns = [
      {
        title: 'S3 bucket',
        dataIndex: 'bucket',
        key: 'bucket'
      },
      {
        title: 'Object',
        dataIndex: 'object',
        key: 'object',
        sorter: (a, b) => {
          if (a.object > b.object) return 1;
          if (a.object === b.object) return 0;
          return -1;
        }
      },
      {
        title: 'Chromosome',
        dataIndex: 'chromosome',
        key: 'chromosome',
        sorter: (a, b) => {
          if (a.chromosome > b.chromosome) return 1;
          if (a.chromosome === b.chromosome) return 0;
          return -1;
        }
      },
      {
        title: 'Location',
        dataIndex: 'location',
        key: 'location',
        sorter: (a, b) => {
          if (a.location > b.location) return 1;
          if (a.location === b.location) return 0;
          return -1;
        }
      },
      {
        title: '',
        key: 'view',
        render: (text, record) => {
          return (
            <div>
              <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={this.addTableRecordToIGV.bind(this, record)}>Add</Button>
              <Button type="primary" shape="round" icon={<EyeOutlined />} onClick={this.loadRecordToIGV.bind(this, record)}>View</Button>
            </div>
          );
        }
      }
    ];
  }

  loadRecordToIGV(record) {
    console.log(record);
    this.launchIGV(record.bucket, record.object, record.chromosome, record.location, true);
  }

  addTableRecordToIGV(record) {
    console.log(igv.browser);
    if (igv.browser) {
      this.launchIGV(record.bucket, record.object, record.chromosome, record.location, false);
    } else {
      this.launchIGV(record.bucket, record.object, record.chromosome, record.location, true);
    }
  }

  componentDidMount() {
    const params = {
      Bucket: this.state.bucket,
      Prefix: 'data/'
    };

    Auth.currentCredentials()
      .then(credentials => {
        const s3 = new AWS.S3({
          signatureVersion: 'v4',
          credentials: Auth.essentialCredentials(credentials)
        });
        s3.listObjectsV2(params, (err, data) => {
          if (err) {
            console.log(err);
          } else {
            const fileList = [];
            data.Contents.forEach(element => {
              if (element.Key.endsWith('.bam')) {
                fileList.push({text: `${element.Key} (${this.bytesToSize(element.Size)})`, value: element.Key});
              }
            });
            this.setState({data: fileList});
          }
        });
      });
    const tableData = [];
    tableData.push({key: tableData.length, bucket: 'swb-mybucket', object: 'data/NA21144.bam', chromosome: 'chr11', location: 95577818});
    tableData.push({key: tableData.length, bucket: this.state.bucket, object: 'data/NA21144.chrom11.ILLUMINA.bwa.GIH.low_coverage.20130415.bam', chromosome: 'chr11', location: 57425684});
    tableData.push({key: tableData.length, bucket: this.state.bucket, object: 'data/NA21144.chrom11.ILLUMINA.bwa.GIH.low_coverage.20130415.bam', chromosome: 'chr11', location: 34158540});
    tableData.push({key: tableData.length, bucket: this.state.bucket, object: 'data/NA21144.chrom20.ILLUMINA.bwa.GIH.low_coverage.20130415.bam', chromosome: 'chr20', location: 46812315});
    tableData.push({key: tableData.length, bucket: this.state.bucket, object: 'data/NA21144.chrom20.ILLUMINA.bwa.GIH.low_coverage.20130415.bam', chromosome: 'chr20', location: 51435450});
    this.setState({
      dataSource: tableData
    })
  }

  bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  }

  handleBamFileChange (event) {
    this.setState({ bamFile: event });
  };

  handleChromosomeChange (event) {
    this.setState({chromosome: event.target.value});
  }

  handleLocationChange (event) {
    this.setState({location: event.target.value});
  }

  inputToIGV () {
    console.log(this.state);
    this.launchIGV(this.state.bucket, this.state.bamFile, this.state.chromosome, this.state.location, true);
  }

  launchIGV (bucket, object, chromosome, location, overwrite) {
    if (overwrite) {
      igv.removeAllBrowsers();
    }
    const self = this;
    Auth.currentCredentials()
      .then(credentials => {
        const s3 = new AWS.S3({
          signatureVersion: 'v4',
          credentials: Auth.essentialCredentials(credentials)
        });
        const params = {Bucket: bucket, Key: object, Range: 'bytes=0-1'};
        s3.getObject(params, function(err, data) {
          if (err) {
            console.log(err, err.stack);
            self.errorNotification(
              'Unable to access s3 object',
              `Encountered the following error when accessing s3 object "s3://${bucket}/${object}": ${err}`
              );
          }
          else {
            const igvContainer = document.getElementById('igv-div');
            const track = {
              name: object,
              url: function() {
                let bamFileUrl = s3.getSignedUrl('getObject', {Bucket: bucket, Key: object, Expires: 60});
                console.log(`presigned bam file url: ${bamFileUrl}`);
                return bamFileUrl;
              },
              indexURL: function() {
                // assume the index file has .bai suffix
                let baiFileUrl = s3.getSignedUrl('getObject', {Bucket: bucket, Key: `${object}.bai`, Expires: 60});
                console.log(`presigned bai file url: ${baiFileUrl}`);
                return baiFileUrl;
              },
              format: 'bam'
            };
            if (overwrite) {
              var igvOptions = {
                genome: 'hg18', // TODO: select different referencing genomes
                locus: `${chromosome}:${location}`,
                tracks: [track]
              };

              igv.createBrowser(igvContainer, igvOptions)
                .then(function (browser) {
                    igv.browser = browser;
                    console.log("Created IGV browser");
                });
            } else {
              igv.browser.loadTrack(track);
            }
          }
        });
      });
  }

  errorNotification(message, description) {
    notification.error({
      message: message,
      description: description,
      duration: 0
    });
  }

  render() {
    const { Option } = Select;
    const { Content } = Layout;
    const options = this.state.data.map(d => <Option key={d.value}>{d.text}</Option>);
    return (
      <Layout className="layout">
        <AmplifySignOut />
        <Content style={{ padding: '0 50px' }}>
          <Divider>Input parameters (use case 1)</Divider>
          <Row gutter={4}>
            <Col span={12}>
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="Select a bam file..."
                optionFilterProp="children"
                onChange={this.handleBamFileChange.bind(this)}
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {options}
              </Select>
            </Col>
            <Col span={5}>
              <Input addonBefore="Chromosome" onChange={this.handleChromosomeChange.bind(this)}></Input>
            </Col>
            <Col span={5}>
              <Input addonBefore="Location" onChange={this.handleLocationChange.bind(this)}></Input>
            </Col>
            <Col span={1}>
              <Button type='primary' icon={<EyeOutlined />} onClick={this.inputToIGV.bind(this)} shape='round'>View</Button>
            </Col>
          </Row>
          <Divider>Input parameters (use case 2)</Divider>
          <Table dataSource={this.state.dataSource} columns={this.columns} size='small' pagination={{pageSize: 2}}/>
          <Divider>IGV viewer</Divider>
          <div id='igv-div'></div>
        </Content>
      </Layout>
    );
  }
}

export default withAuthenticator(App);
