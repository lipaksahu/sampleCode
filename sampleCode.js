// Sample 1

import React, {Component} from 'react';
import Slider from "react-slick";
import { Chart } from 'ireact-components';

import commonHelper from '../../components/common/commonHelper';
import {inMobiPulse} from '../../components/common/Constants';
import CollectionSegment from '../../components/audiences/CollectionSegment';
import _ from "../core/lodashLoader";
import {insightConfig} from '../../components/common/Constants';


const settings = {
    dots: true,
    infinite: true,
    speed: 4000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false
};

export default class Insights extends Component{
    constructor(props){
        super(props);
        this.state = {
            pieOptions: insightConfig,
            pulseArr: []
        }
    }

    sortInsightsData = (list) => {
        return Object.entries(list)
            .sort((a,b) => parseFloat(a[1]) - parseFloat(b[1]) )
            .reduce( (acc, item) => {
                acc[item[0]] =  parseFloat(item[1]);
                return acc
            }, {})
    };

    transformPulseInsights(insights){
        const pulseArr = insights.map(insight => {
            let {data, attribute, description} = insight;
            data = this.sortInsightsData( JSON.parse(data) );
            const xAxis = Object.keys(data);
            const yAxis = Object.values(data).sort((a, b) => a-b);

            return {
                xAxis,
                yAxis,
                description,
                attribute
            }
        });

        this.setState({pulseArr});
    }

    componentWillMount() {
        const { pdpDetails: {insights = []} } = this.props;
        const pulseInsights = insights.filter((insight => insight.type === commonHelper.getString('pulse')));

        if(pulseInsights.length > 0) {
            this.transformPulseInsights(pulseInsights);
        }
    }

    render(){
        return(
            <div>
                <div className="insights-wrap">
                    <div className="insights-main">
                        <h2>{commonHelper.getString("audience.insights")}</h2>
                        <PulseSlider {...this.state} />
                    </div>
                </div>
                <CollectionSegment {...this.props}/>
            </div>
        )
    }
}

const PulseSlider = (props) => {
    const {pieOptions, pulseArr = []} = props;
    return (
        <Slider {...settings}>
            {
                pulseArr.map(item => {
                    const {description, attribute, xAxis, yAxis} = item;
                    let barData = _.cloneDeep(pieOptions);
                    barData.series[0].data = yAxis;
                    barData.xAxis.categories = xAxis;
                    return (
                        <div>
                            <div className="insights-container">
                                <div className="insights-left">
                                    <div>
                                        <p>Trends for <b>{attribute} *</b></p>
                                        <div className="chart-container">
                                            <Chart config={barData} type="line"/>
                                        </div>
                                    </div>
                                </div>
                                <div className="insights-right">
                                    <h3 className="desc-insight">{description}</h3>
                                    <hr className="hr-insight"/>
                                    <div>
                                        <p>{commonHelper.getString("audience.insights.policy")}</p>
                                        <div className="brought-to-you">
                                            <small>{commonHelper.getString("audience.insights.by")}</small>
                                            <img src={inMobiPulse} alt={commonHelper.getString('pulse.alt')}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })
            }
        </Slider>
    )
};

// Sample 2

export default class ExploreSegments extends Component {

    constructor(props) {
        super(props);
        this.state = {
            segments: [],
            isLoaded: false
        }
    }

    componentDidMount() {
        this.fetchAllSegments();
    }

    componentWillReceiveProps(nextProps) {
        const {selectedCountry} = nextProps;
        if(selectedCountry !== this.props.selectedCountry) {
            this.fetchAllSegments(selectedCountry);
        }
    }

    async fetchAllSegments(){
        const maxLimit = 8;
        try{
            this.setState({isLoaded: false}, async () => {
                const {selectedCountry} = this.props;
                const { transformedSegments = [] } = await fetchSegmentsBySearchCriteria(selectedCountry);
                let segments = [];

                if( transformedSegments.length >= maxLimit) {
                    segments = transformSegments( transformedSegments.slice(0, maxLimit) );
                }
                this.setState({segments, isLoaded: true});
            });
        }catch (e) {
            messageNotificationController.addItem({
                message: getString("some.error"),
                type : 'danger',
                dismiss:dismissNotificationItem,
                expires: 5000
            });
        }
    }

    handleClick = () => {
        navController.resetPageAttributes({
            pageId: 'audiences',
            action: 'browse'
        });
    };

    render () {
        const {isLoaded, segments = []} = this.state;
        return (
            <div>
                {
                    <div className="segment-wrapper">
                        <div className="container-category">
                            <h3>{getString('exp.seg')}</h3>
                            <p>{getString('exp.seg.desc')}</p>
                            <div className="category-items audienceListWrapper animated fadeIn wrap">
                                {
                                    (isLoaded && segments.length >= 8) ?
                                        segments.map((item, key) => <AudienceCardItem itemData={item} key={key} /> ) : (isLoaded && segments.length < 8) ? ''
                                        : <SVGLoader />
                                }
                                {
                                    (isLoaded && segments.length >= 8) ? <button className="home-button" onClick={ () => this.handleClick() }>{getString('view.all')}</button> : ''
                                }
                            </div>
                        </div>
                    </div>
                }
            </div>
        )
    }
};

// Sample 3

class AudienceList extends Component {

	constructor(props){
		super(props);
		this.state = {
            allSegments: [],
            unProtectedSegments: [],
            pagination: {
                pageSize: 40,
                totalRecords: 0
			},
            segmentsLoaded: false,
            currentPageNo: 0,
            searchString: '',
            selectedCountry: ''
		};
	}

    componentDidMount() {
        const {selectedCountry} = this.props;
        this.setState({selectedCountry}, () => {
            this.getSegmentsByCountry();
        });
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(prevState.currentPageNo !== this.state.currentPageNo) {
            this.getSegmentsByCountry();
        }
    }

    componentWillReceiveProps(nextProps) {
        const {selectedCountry, category} = this.props;
	    if( (selectedCountry !== nextProps.selectedCountry) || (category !== nextProps.category) ) {
            this.setState({segmentsLoaded: false, selectedCountry: nextProps.selectedCountry, currentPageNo: 0}, () => {
                this.getSegmentsByCountry();
            });
        }
    }

    async getSegmentsByCountry() {
        const { industry = '', provider = '', category = ''} = this.props;
        const {currentPageNo, searchString, selectedCountry} = this.state;
        try{
            const {transformedSegments = [], pagination = {}} = await fetchSegmentsBySearchCriteria(selectedCountry, currentPageNo, industry, category, provider, searchString);
            const transformedData = transformSegments(transformedSegments);
            const filteredData = transformedData.filter(item => item.insights.length > 0);
            const unProtectedSegments = filteredData.filter(item => !item.isLoginProtected);
            this.setState({
                allSegments: transformedData,
                unProtectedSegments: unProtectedSegments,
                pagination,
                segmentsLoaded: true
            });
        } catch (e) {
            console.log(e)
        }
    };

    updatePageNumber = ({end, start}) => {
    	const {pagination: {pageSize}} = this.state;
        const currentPageNo =  Math.floor((start -1) / pageSize);
        this.setState({ currentPageNo, segmentsLoaded: false }, () => {
        	  this.getSegmentsByCountry();
		})
    };

    searchSegmentsHandler = ({ searchString = '' }) => {
        const str = searchString.trim().toUpperCase();
        const segmentsLoaded = false;
        const currentPageNo = 0;

        this.setState({ searchString: str, currentPageNo, segmentsLoaded });
        this.getSegmentsByCountry();
    };

    filterChange = async (changedObject, fullObject) => {
        const { selectedCountry = '' } = this.props;
        const searchRequests = getSearchRequests(fullObject, selectedCountry);

        if (searchRequests.length > 0) {
            try{
                this.setState({ segmentsLoaded: false });
                const {transformedSegments = [], pagination = {}} = await fetchSegmentsByAllCriteria(PageNo, searchRequests, batchSize);
                const transformedData = transformSegments(transformedSegments);
                this.setState({
                    allSegments: transformedData,
                    pagination,
                    segmentsLoaded: true
                });
            } catch (e) {
                console.log(e)
            }
        }
    };

    compareSegments = (sortValue1, sortValue2) => {
        const property = this.state.sortProperty;
        let sortUpdatedVal1, sortUpdatedVal2;
        if(property === 'reachAsc' || property === 'reachDsc') {
            sortUpdatedVal1 = Number(sortValue1.reachCount);
            sortUpdatedVal2 = Number(sortValue2.reachCount);
        } else if(property === 'price'){
            sortUpdatedVal1 = Number(sortValue1.price.value);
            sortUpdatedVal2 = Number(sortValue2.price.value);
        }
        if (property === 'reachDsc') {
            return sortUpdatedVal2 - sortUpdatedVal1;
        }
        return sortUpdatedVal1 - sortUpdatedVal2;
    };

    sortSegmentsHandler = ({sortVal}) => {
        this.setState({sortProperty:sortVal}, () => {
            const {allSegments} = this.state;
            const sortedData = allSegments.sort(this.compareSegments);
            this.setState(prevState => ({
                allSegments: sortedData,
                sortByAsc: prevState.sortByAsc,
                isAscending: !prevState.isAscending
            }));
        });
    };

    render() {
        const { allSegments = [], pagination: {totalRecords}, segmentsLoaded, searchString } = this.state;
        const {categories, industries, providers} = this.props;
        const tableDefaults = {
            start: 1,
            offset: 40,
            perPage: 40,
            totalRecords,
            serverPagination: true
        };
		return (
		    <div>
                <div className="aud-top-block-wrap audwrapper">
                    <div className="aud-block-container">
                        <h3 className="aud-dt">
                            <span className="aud-lbl">{commonHelper.getString('audiences.heading')}</span>
                        </h3>
                        <p className="exp-tagline">{commonHelper.getString('explore.tagline')}</p>
                    </div>
                </div>
                <div className="paginated-table">
                    <div className="container-filter">
                        <div className="search-actions">
                            <RXForm onValueChange={this.filterChange}>
                                <RXDropdown
                                    name="category"
                                    options={categories}
                                    label={getString('cat')}
                                    multiSelect
                                />
                                <RXDropdown
                                    name="industry"
                                    options={industries}
                                    label={getString('ind')}
                                    multiSelect
                                />
                            </RXForm>
                            <RXElementGroup onValueChange={this.sortSegmentsHandler}>
                                <RXDropdown
                                    name="sortVal"
                                    label='Sort By'
                                    options={ getSortList() }
                                />
                            </RXElementGroup>
                        </div>

                        <RXElementGroup onValueChange={this.searchSegmentsHandler}>
                            <div className="srch-field-input">
                                <RXTextInput
                                    showLabel={false}
                                    name="searchString"
                                    placeholder={'Search Audiences'}
                                    value={searchString}
                                    debounceTime={500}
                                />
                            </div>
                        </RXElementGroup>
                    </div>
                    <p className="total-record">{getString('showing')} <b>{totalRecords}</b> {getString('segments')}</p>
                    <PaginationWrapper
                        records={allSegments}
                        {...tableDefaults}
                        fetchDataFromServer={this.updatePageNumber}
                    >
                        {
                            segmentsLoaded ? <AudienceItems {...this.props} /> : <SVGLoader />
                        }
                        <Pagination className="audience-pagination" />
                    </PaginationWrapper>
                </div>
                <Copyrights />
            </div>
		);
	}
}

const AudienceItems = ({records = []}) => {
    return (
        <List
            items={records}
            ListItem={AudienceCardItem}
            className={'audienceListWrapper animated fadeIn wrap'}
            noDataMessage={<NoDataMessageComponent />}
        />
    )
};

// Sample 4

export default class FileUploaderCustom extends Component {

    constructor(props){
        super(props);
        this.state = {
            imageURL: null
        };
    }

    componentWillMount() {
        const {imageURL} = this.props;
        if(imageURL){
            this.setState({imageURL})
        }
    }

    uploadProgressHandler(progress) {
        const {loaded,total} = progress;
        const percentage = Math.ceil((loaded / total) * 100);
    }

    fileDialogCompleteHandler() {
        this.startUpload();
    };

    uploadSuccessHandler() {
        if(arguments[1]._response && arguments[1]._response.status === 201) {
            const { name } = arguments[0];
            const {id} = this.props;
            const imageURL = getConfig('cdnPath') + name;
            const assestInfoObj = {
                name,
                id,
                imageURL
            };
            if(id){
                this.setState({imageURL}, ()=>{
                    this.props.execute('setImageUrl', assestInfoObj);
                    messageNotificationController.addItem({
                        message: getString("upload.success"),
                        type : 'success',
                        dismiss:dismissNotificationItem,
                        expires: 3000
                    });
                });
            }
        }
    };

    onFileUploadError(e) {
        messageNotificationController.addItem({
            message: getString("some.error"),
            type : 'error',
            dismiss:dismissNotificationItem,
            expires: 5000
        });
    };

    deleteImage = () => {
        const {id} = this.props;
        if(id){
            this.setState({imageURL: null}, () => {
                this.props.execute('deleteImage', id);
            })
        }
    };

    render() {
        const {
            accountGuid,
            id,
            isMultiple = false,
            maxUploadLimit = 1,
            label = 'Upload Logo',
            type='default'
        } = this.props;
        const {imageURL} = this.state;
        return (
            <div>
                {
                    (imageURL && !isMultiple) ? <ShowImage imageURL={imageURL} deleteImage={this.deleteImage} type={type}/> :
                    <div className={`upload-image-container ${type}`}>
                        <BlobFileUploader
                            acceptFileTypes="image/*"
                            multipleUpload={isMultiple}
                            fileUploadErrorHandler={this.onFileUploadError.bind(this)}
                            fileDialogCompleteHandler={this.fileDialogCompleteHandler}
                            uploadProgressHandler={this.uploadProgressHandler.bind(this)}
                            uploadSuccessHandler={this.uploadSuccessHandler.bind(this)}
                            maxUploadLimit={maxUploadLimit}
                            supportedFileTypesMessage=""
                            maxFileSize="1 MB"
                            file_post_name="file"
                            requestId="uploadAsset"
                            id={id}
                            data={{accountGuid}}
                        >
                            {label}
                        </BlobFileUploader>
                    </div>
                }
            </div>
        )
    }
}

class ShowImage extends Component{
    constructor(props){
        super(props);
    }

    render(){
        const {imageURL, type} = this.props;
        return (
            <div className={`show-image ${type === 'flat' ? 'show-image-flat' : ''}`} >
                <div className="delete-img" onClick={this.props.deleteImage}>X</div>
                <img src={`${imageURL}`} alt="image"/>
            </div>
        )
    }
}
